-- Dữ liệu mẫu cho môi trường dev. Tên hạng và quy tắc điểm là GIÁ TRỊ TẠM, sửa trên trang quản trị.
insert into public.tiers (id, name, min_points, color_key, sort) values
  ('tier1', 'Thành viên',      0,    'tier1', 1),
  ('tier2', 'Hạng Bạc',        500,  'tier2', 2),
  ('tier3', 'Hạng Vàng',       1000, 'tier3', 3),
  ('tier4', 'Hạng Kim Cương',  2000, 'tier4', 4);

insert into public.loyalty_rule_versions (version, effective_from, config) values
  (1, '2026-01-01T00:00:00+07:00', '{
    "earn": { "amountPerPoint": 10000, "base": "after_discount", "rounding": "floor" },
    "tierMultipliers": { "tier3": 1.2, "tier4": 1.5 },
    "weekdayMultipliers": { "0": 2, "6": 2 },
    "birthdayBonus": 200,
    "signupBonus": 50,
    "redeemValue": 100,
    "expiryMonths": null
  }');

insert into public.offers (kind, value, unit, tone, title, body, ends_at) values
  ('voucher', '−10%', 'TỐI ĐA 80K', 'sky', 'Ưu đãi Hạng Vàng', 'Áp dụng mọi sản phẩm sữa', '2026-12-31T23:59:59+07:00'),
  ('event',   '7/12', 'WORKSHOP',   'sky', 'Dinh dưỡng cho bé 1–3 tuổi', 'Cửa hàng Quận 7 · 9:00 sáng', '2026-12-07T12:00:00+07:00');
