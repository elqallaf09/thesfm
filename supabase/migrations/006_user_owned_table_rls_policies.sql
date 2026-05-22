ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own expenses" ON expense_items;
CREATE POLICY "Users can select own expenses" ON expense_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own expenses" ON expense_items;
CREATE POLICY "Users can insert own expenses" ON expense_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own expenses" ON expense_items;
CREATE POLICY "Users can update own expenses" ON expense_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own expenses" ON expense_items;
CREATE POLICY "Users can delete own expenses" ON expense_items FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own income" ON monthly_income_sources;
CREATE POLICY "Users can select own income" ON monthly_income_sources FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own income" ON monthly_income_sources;
CREATE POLICY "Users can insert own income" ON monthly_income_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own income" ON monthly_income_sources;
CREATE POLICY "Users can update own income" ON monthly_income_sources FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own income" ON monthly_income_sources;
CREATE POLICY "Users can delete own income" ON monthly_income_sources FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own savings" ON savings_items;
CREATE POLICY "Users can select own savings" ON savings_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own savings" ON savings_items;
CREATE POLICY "Users can insert own savings" ON savings_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own savings" ON savings_items;
CREATE POLICY "Users can update own savings" ON savings_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own savings" ON savings_items;
CREATE POLICY "Users can delete own savings" ON savings_items FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own investments" ON investment_items;
CREATE POLICY "Users can select own investments" ON investment_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own investments" ON investment_items;
CREATE POLICY "Users can insert own investments" ON investment_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own investments" ON investment_items;
CREATE POLICY "Users can update own investments" ON investment_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own investments" ON investment_items;
CREATE POLICY "Users can delete own investments" ON investment_items FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own goals" ON financial_goals;
CREATE POLICY "Users can select own goals" ON financial_goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own goals" ON financial_goals;
CREATE POLICY "Users can insert own goals" ON financial_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own goals" ON financial_goals;
CREATE POLICY "Users can update own goals" ON financial_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own goals" ON financial_goals;
CREATE POLICY "Users can delete own goals" ON financial_goals FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own projects" ON projects;
CREATE POLICY "Users can select own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);
