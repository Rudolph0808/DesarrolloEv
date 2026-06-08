
CREATE TABLE public.plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.energy_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  period date NOT NULL,
  water numeric,
  gas numeric,
  electricity numeric,
  water_pred numeric,
  gas_pred numeric,
  electricity_pred numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plant_id, period)
);

CREATE INDEX idx_readings_period ON public.energy_readings(period);
CREATE INDEX idx_readings_plant ON public.energy_readings(plant_id);

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read plants" ON public.plants FOR SELECT USING (true);
CREATE POLICY "public write plants" ON public.plants FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "public read readings" ON public.energy_readings FOR SELECT USING (true);
CREATE POLICY "public write readings" ON public.energy_readings FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_readings_updated
BEFORE UPDATE ON public.energy_readings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
