-- KaloriTakip — shared food seed (per 100 g, approximate values).
-- Run after schema.sql. Safe to re-run (deletes and re-inserts seed rows).
-- Folded Turkish names must be unique among shared rows.

delete from public.foods where source = 'seed';

insert into public.foods
  (name_en, name_tr, kcal_100, protein_100, carbs_100, fat_100, serving_g, serving_label_en, serving_label_tr, source)
values
  -- Breads & grains
  ('White bread', 'Beyaz ekmek', 265, 9, 49, 3.2, 25, '1 slice', '1 dilim', 'seed'),
  ('Whole wheat bread', 'Tam buğday ekmeği', 247, 13, 41, 3.4, 25, '1 slice', '1 dilim', 'seed'),
  ('Simit', 'Simit', 310, 10, 56, 5, 110, '1 simit', '1 simit', 'seed'),
  ('Lavash', 'Lavaş', 275, 9, 55, 1.5, 60, '1 piece', '1 adet', 'seed'),
  ('Pide bread', 'Pide ekmeği', 270, 9, 52, 2.5, 100, '1/2 pide', 'yarım pide', 'seed'),
  ('Cooked white rice', 'Pirinç pilavı', 180, 3, 30, 5, 150, '1 plate', '1 tabak', 'seed'),
  ('Bulgur pilaf', 'Bulgur pilavı', 150, 4, 25, 4, 150, '1 plate', '1 tabak', 'seed'),
  ('Cooked pasta', 'Makarna (haşlanmış)', 158, 5.8, 31, 0.9, 200, '1 plate', '1 tabak', 'seed'),
  ('Oats (dry)', 'Yulaf ezmesi', 379, 13, 67, 7, 40, '1 portion', '1 porsiyon', 'seed'),

  -- Breakfast
  ('Egg', 'Yumurta', 143, 12.6, 0.7, 9.5, 50, '1 egg', '1 yumurta', 'seed'),
  ('Menemen', 'Menemen', 120, 6, 5, 9, 200, '1 portion', '1 porsiyon', 'seed'),
  ('White cheese', 'Beyaz peynir', 260, 15, 2, 21, 30, '1 slice', '1 dilim', 'seed'),
  ('Kashar cheese', 'Kaşar peyniri', 350, 23, 1, 28, 20, '1 slice', '1 dilim', 'seed'),
  ('Black olives', 'Siyah zeytin', 190, 1.5, 4, 18, 15, '5 olives', '5 zeytin', 'seed'),
  ('Green olives', 'Yeşil zeytin', 145, 1, 3.8, 15, 15, '5 olives', '5 zeytin', 'seed'),
  ('Honey', 'Bal', 304, 0.3, 82, 0, 20, '1 tbsp', '1 yemek kaşığı', 'seed'),
  ('Butter', 'Tereyağı', 717, 0.9, 0.1, 81, 10, '1 tsp', '1 tatlı kaşığı', 'seed'),
  ('Jam', 'Reçel', 250, 0.3, 62, 0.1, 20, '1 tbsp', '1 yemek kaşığı', 'seed'),
  ('Sucuk (fried)', 'Sucuk (kızarmış)', 450, 20, 2, 40, 30, '3 slices', '3 dilim', 'seed'),
  ('Tahini-molasses', 'Tahin pekmez', 480, 11, 50, 27, 30, '1 tbsp', '1 yemek kaşığı', 'seed'),

  -- Dairy
  ('Yogurt (whole)', 'Yoğurt (tam yağlı)', 61, 3.5, 4.7, 3.3, 150, '1 bowl', '1 kase', 'seed'),
  ('Ayran', 'Ayran', 37, 1.7, 2.5, 2, 250, '1 glass', '1 bardak', 'seed'),
  ('Milk (whole)', 'Süt (tam yağlı)', 62, 3.2, 4.8, 3.3, 200, '1 glass', '1 bardak', 'seed'),
  ('Cacık', 'Cacık', 45, 2.5, 3, 2.5, 150, '1 bowl', '1 kase', 'seed'),

  -- Soups
  ('Red lentil soup', 'Mercimek çorbası', 60, 3.5, 8, 1.8, 250, '1 bowl', '1 kase', 'seed'),
  ('Ezogelin soup', 'Ezogelin çorbası', 65, 3, 9, 2, 250, '1 bowl', '1 kase', 'seed'),
  ('Tarhana soup', 'Tarhana çorbası', 55, 2.5, 8, 1.5, 250, '1 bowl', '1 kase', 'seed'),
  ('Chicken soup', 'Tavuk çorbası', 50, 4, 4, 2, 250, '1 bowl', '1 kase', 'seed'),

  -- Main dishes
  ('Grilled chicken breast', 'Izgara tavuk göğsü', 165, 31, 0, 3.6, 150, '1 portion', '1 porsiyon', 'seed'),
  ('Chicken thigh (roasted)', 'Tavuk but (fırın)', 215, 26, 0, 12, 120, '1 piece', '1 adet', 'seed'),
  ('Grilled meatballs', 'Izgara köfte', 240, 18, 5, 16, 120, '4 pieces', '4 adet', 'seed'),
  ('Adana kebab', 'Adana kebap', 260, 17, 2, 21, 150, '1 skewer', '1 şiş', 'seed'),
  ('Chicken döner', 'Tavuk döner', 190, 22, 2, 10, 100, '1 portion', '1 porsiyon', 'seed'),
  ('Beef döner', 'Et döner', 230, 20, 1, 16, 100, '1 portion', '1 porsiyon', 'seed'),
  ('Lahmacun', 'Lahmacun', 220, 10, 30, 7, 130, '1 piece', '1 adet', 'seed'),
  ('Kıymalı pide', 'Kıymalı pide', 250, 11, 32, 9, 250, '1 pide', '1 pide', 'seed'),
  ('Grilled salmon', 'Izgara somon', 208, 20, 0, 13, 150, '1 fillet', '1 fileto', 'seed'),
  ('Grilled sea bass', 'Izgara levrek', 125, 24, 0, 3, 200, '1 fish', '1 balık', 'seed'),
  ('Beans in tomato sauce', 'Kuru fasulye', 110, 6, 15, 3, 250, '1 plate', '1 tabak', 'seed'),
  ('Chickpea stew', 'Nohut yemeği', 120, 6, 17, 3.5, 250, '1 plate', '1 tabak', 'seed'),
  ('Karnıyarık', 'Karnıyarık', 130, 5, 8, 9, 250, '1 piece', '1 adet', 'seed'),
  ('Stuffed vine leaves (olive oil)', 'Zeytinyağlı yaprak sarma', 160, 3, 20, 8, 100, '5 pieces', '5 adet', 'seed'),
  ('Green beans in olive oil', 'Zeytinyağlı taze fasulye', 70, 2, 7, 4, 200, '1 plate', '1 tabak', 'seed'),
  ('İmam bayıldı', 'İmam bayıldı', 110, 2, 9, 8, 200, '1 piece', '1 adet', 'seed'),
  ('Mantı with yogurt', 'Mantı (yoğurtlu)', 190, 9, 25, 6, 250, '1 plate', '1 tabak', 'seed'),
  ('Spinach with eggs', 'Yumurtalı ıspanak', 85, 5, 4, 6, 200, '1 plate', '1 tabak', 'seed'),

  -- Fast food / snacks
  ('Toast (kashar)', 'Kaşarlı tost', 280, 12, 32, 12, 120, '1 toast', '1 tost', 'seed'),
  ('Börek (cheese)', 'Peynirli börek', 310, 9, 30, 18, 100, '1 slice', '1 dilim', 'seed'),
  ('Poğaça', 'Poğaça', 340, 8, 40, 16, 70, '1 piece', '1 adet', 'seed'),
  ('Açma', 'Açma', 330, 8, 48, 12, 80, '1 piece', '1 adet', 'seed'),
  ('French fries', 'Patates kızartması', 312, 3.4, 41, 15, 150, '1 portion', '1 porsiyon', 'seed'),
  ('Hamburger', 'Hamburger', 260, 13, 28, 11, 200, '1 burger', '1 hamburger', 'seed'),
  ('Pizza (margherita)', 'Pizza (margarita)', 270, 11, 33, 10, 120, '1 slice', '1 dilim', 'seed'),

  -- Fruits & vegetables
  ('Apple', 'Elma', 52, 0.3, 14, 0.2, 150, '1 medium', '1 orta boy', 'seed'),
  ('Banana', 'Muz', 89, 1.1, 23, 0.3, 120, '1 medium', '1 orta boy', 'seed'),
  ('Orange', 'Portakal', 47, 0.9, 12, 0.1, 150, '1 medium', '1 orta boy', 'seed'),
  ('Grapes', 'Üzüm', 69, 0.7, 18, 0.2, 100, '1 bunch', '1 salkım', 'seed'),
  ('Watermelon', 'Karpuz', 30, 0.6, 8, 0.2, 300, '1 slice', '1 dilim', 'seed'),
  ('Tomato', 'Domates', 18, 0.9, 3.9, 0.2, 120, '1 medium', '1 orta boy', 'seed'),
  ('Cucumber', 'Salatalık', 15, 0.7, 3.6, 0.1, 100, '1 medium', '1 orta boy', 'seed'),
  ('Shepherd salad', 'Çoban salata', 45, 1, 5, 2.5, 200, '1 bowl', '1 kase', 'seed'),
  ('Mixed green salad (no dressing)', 'Yeşil salata (sossuz)', 20, 1.2, 3.5, 0.2, 150, '1 bowl', '1 kase', 'seed'),
  ('Potato (boiled)', 'Patates (haşlanmış)', 87, 1.9, 20, 0.1, 150, '1 medium', '1 orta boy', 'seed'),

  -- Nuts & sweets
  ('Hazelnuts', 'Fındık', 628, 15, 17, 61, 30, '1 handful', '1 avuç', 'seed'),
  ('Walnuts', 'Ceviz', 654, 15, 14, 65, 30, '1 handful', '1 avuç', 'seed'),
  ('Almonds', 'Badem', 579, 21, 22, 50, 30, '1 handful', '1 avuç', 'seed'),
  ('Baklava', 'Baklava', 430, 6, 50, 23, 40, '1 piece', '1 dilim', 'seed'),
  ('Sütlaç', 'Sütlaç', 130, 3.5, 24, 2.5, 150, '1 bowl', '1 kase', 'seed'),
  ('Dark chocolate', 'Bitter çikolata', 546, 5, 61, 31, 20, '2 squares', '2 kare', 'seed'),
  ('Turkish delight', 'Lokum', 350, 0, 87, 0, 15, '1 piece', '1 adet', 'seed'),

  -- Drinks
  ('Turkish tea (no sugar)', 'Çay (şekersiz)', 1, 0, 0.2, 0, 100, '1 glass', '1 bardak', 'seed'),
  ('Turkish coffee (no sugar)', 'Türk kahvesi (sade)', 5, 0.3, 0.8, 0.1, 60, '1 cup', '1 fincan', 'seed'),
  ('Sugar', 'Şeker', 387, 0, 100, 0, 4, '1 cube', '1 küp', 'seed'),
  ('Cola', 'Kola', 42, 0, 10.6, 0, 330, '1 can', '1 kutu', 'seed'),
  ('Orange juice', 'Portakal suyu', 45, 0.7, 10, 0.2, 200, '1 glass', '1 bardak', 'seed'),
  ('Olive oil', 'Zeytinyağı', 884, 0, 0, 100, 10, '1 tbsp', '1 yemek kaşığı', 'seed'),

  -- Protein basics
  ('Tuna (canned, in water)', 'Ton balığı (suda)', 116, 26, 0, 1, 80, '1/2 can', 'yarım kutu', 'seed'),
  ('Lean ground beef (cooked)', 'Yağsız kıyma (pişmiş)', 215, 26, 0, 12, 100, '1 portion', '1 porsiyon', 'seed'),
  ('Lentils (cooked)', 'Mercimek (haşlanmış)', 116, 9, 20, 0.4, 150, '1 portion', '1 porsiyon', 'seed'),
  ('Whey protein powder', 'Whey protein tozu', 380, 75, 8, 5, 30, '1 scoop', '1 ölçek', 'seed')
-- skip names that already exist in the shared list (e.g. added by AI)
on conflict (public.fold(name_tr)) where owner is null do nothing;
