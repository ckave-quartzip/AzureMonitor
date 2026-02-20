-- Fix overly permissive RLS policy on azure_sql_wait_stats
DROP POLICY IF EXISTS "Service role can manage wait stats" ON public.azure_sql_wait_stats;

-- Create proper policies for wait stats that edge functions can use via service role
CREATE POLICY "Admins and editors can insert wait stats"
  ON public.azure_sql_wait_stats FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can update wait stats"
  ON public.azure_sql_wait_stats FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete wait stats"
  ON public.azure_sql_wait_stats FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));