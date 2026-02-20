-- Add azure_resource_id column to resources table to link monitored resources to Azure resources
ALTER TABLE public.resources 
ADD COLUMN azure_resource_id uuid REFERENCES public.azure_resources(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX idx_resources_azure_resource_id ON public.resources(azure_resource_id);

-- Add a comment explaining the column
COMMENT ON COLUMN public.resources.azure_resource_id IS 'Optional link to an Azure resource for unified monitoring and cost tracking';