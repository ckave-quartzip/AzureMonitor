import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  action: "create";
  email: string;
  password: string;
  fullName?: string;
  role: "admin" | "editor" | "viewer";
}

interface ListUsersRequest {
  action: "list";
}

interface UpdateRoleRequest {
  action: "update-role";
  userId: string;
  role: "admin" | "editor" | "viewer";
}

interface DeleteUserRequest {
  action: "delete";
  userId: string;
}

type RequestBody = CreateUserRequest | ListUsersRequest | UpdateRoleRequest | DeleteUserRequest;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the calling user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token to verify their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !callingUser) {
      console.error("Failed to get calling user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if calling user is an admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("User is not an admin:", callingUser.id);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    console.log("Processing action:", body.action);

    switch (body.action) {
      case "list": {
        // Get all users
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error("Error listing users:", listError);
          throw listError;
        }

        // Get all roles
        const { data: roles, error: rolesError } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) {
          console.error("Error fetching roles:", rolesError);
          throw rolesError;
        }

        // Get all profiles
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name");

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          throw profilesError;
        }

        // Combine data
        const users = authUsers.users.map((user) => {
          const userRole = roles?.find((r) => r.user_id === user.id);
          const profile = profiles?.find((p) => p.id === user.id);
          
          return {
            id: user.id,
            email: user.email,
            fullName: profile?.full_name || user.user_metadata?.full_name || null,
            role: userRole?.role || null,
            createdAt: user.created_at,
            lastSignIn: user.last_sign_in_at,
          };
        });

        console.log(`Listed ${users.length} users`);
        return new Response(
          JSON.stringify({ users }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create": {
        const { email, password, fullName, role } = body;

        if (!email || !password || !role) {
          return new Response(
            JSON.stringify({ error: "Email, password, and role are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create the user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email for admin-created users
          user_metadata: {
            full_name: fullName,
          },
        });

        if (createError) {
          console.error("Error creating user:", createError);
          throw createError;
        }

        // The profile should be created by the trigger, but let's ensure it exists
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: newUser.user.id,
            full_name: fullName,
          }, { onConflict: "id" });

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }

        // Assign the role
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: newUser.user.id,
            role: role,
          });

        if (roleInsertError) {
          console.error("Error assigning role:", roleInsertError);
          // Clean up: delete the user if role assignment fails
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          throw roleInsertError;
        }

        console.log(`Created user ${email} with role ${role}`);
        return new Response(
          JSON.stringify({ 
            user: {
              id: newUser.user.id,
              email: newUser.user.email,
              fullName,
              role,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update-role": {
        const { userId, role } = body;

        if (!userId || !role) {
          return new Response(
            JSON.stringify({ error: "User ID and role are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Prevent admin from changing their own role
        if (userId === callingUser.id) {
          return new Response(
            JSON.stringify({ error: "Cannot change your own role" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete existing role
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        // Insert new role
        const { error: updateError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: userId,
            role: role,
          });

        if (updateError) {
          console.error("Error updating role:", updateError);
          throw updateError;
        }

        console.log(`Updated role for user ${userId} to ${role}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { userId } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "User ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Prevent admin from deleting themselves
        if (userId === callingUser.id) {
          return new Response(
            JSON.stringify({ error: "Cannot delete your own account" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete user (cascades to profiles and user_roles due to foreign keys)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error("Error deleting user:", deleteError);
          throw deleteError;
        }

        console.log(`Deleted user ${userId}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error in manage-users function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
