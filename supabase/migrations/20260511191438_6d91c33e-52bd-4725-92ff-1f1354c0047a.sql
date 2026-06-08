
CREATE TABLE public.unit_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  energy text NOT NULL CHECK (energy IN ('water','gas','electricity')),
  cost_per_unit numeric NOT NULL,
  currency text NOT NULL DEFAULT 'MXN',
  effective_from date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (energy, effective_from)
);

ALTER TABLE public.unit_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read unit_costs" ON public.unit_costs FOR SELECT USING (true);
CREATE POLICY "public write unit_costs" ON public.unit_costs FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER touch_unit_costs BEFORE UPDATE ON public.unit_costs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
