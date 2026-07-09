/*
# GameVault Seed Data

Inserts sample games and tags to demonstrate the platform.
*/

-- Insert sample games
INSERT INTO games (id, title, slug, description, developer, publisher, cover_url, banner_url, genre, release_date, price, royalty_percentage, is_resellable, is_active, downloads_count) VALUES
(
  'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  'Neon Horizon',
  'neon-horizon',
  'Embark on an epic journey through a cyberpunk metropolis in this action RPG. Customize your character with hundreds of weapons, skills, and augmentations as you fight to uncover the secrets of Neon Horizon.',
  'Stellar Games',
  'GameVault Publishing',
  'https://images.pexels.com/photos/1670988/pexels-photo-1670988.jpeg',
  'https://images.pexels.com/photos/2147784/pexels-photo-2147784.jpeg',
  'Action RPG',
  '2024-01-15',
  29.99,
  12.50,
  true,
  true,
  1250
),
(
  'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
  'Pixel Legends',
  'pixel-legends',
  'Relive the golden age of gaming with this modern retro platformer. Featuring hand-crafted pixel art, challenging gameplay, and secrets waiting to be discovered.',
  'Retro Studios',
  'GameVault Publishing',
  'https://images.pexels.com/photos/275033/pexels-photo-275033.jpeg',
  'https://images.pexels.com/photos/1242348/pexels-photo-1242348.jpeg',
  'Platformer',
  '2023-11-20',
  14.99,
  15.00,
  true,
  true,
  3420
),
(
  'c3d4e5f6-a7b8-9012-3456-7890abcdef12',
  'Void Runners',
  'void-runners',
  'Build your ship, assemble your crew, and explore the infinite cosmos. Trade, fight, and discover in this vast space simulation.',
  'Cosmic Dev',
  'Stellar Games',
  'https://images.pexels.com/photos/73871/pexels-photo-73871.jpeg',
  'https://images.pexels.com/photos/2387871/pexels-photo-2387871.jpeg',
  'Space Sim',
  '2024-03-01',
  39.99,
  10.00,
  true,
  true,
  890
),
(
  'd4e5f6a7-b8c9-0123-4567-890abcdef123',
  'Cyber Drift',
  'cyber-drift',
  'High-speed racing through neon-lit streets. Customize your vehicle, master the drift, and dominate the underground racing scene.',
  'Neon Arts',
  'GameVault Publishing',
  'https://images.pexels.com/photos/1242348/pexels-photo-1242348.jpeg',
  'https://images.pexels.com/photos/2147784/pexels-photo-2147784.jpeg',
  'Racing',
  '2024-02-14',
  19.99,
  15.00,
  true,
  true,
  2100
);

-- Insert sample tags
INSERT INTO tags (id, name, slug, category) VALUES
('11111111-1111-1111-1111-111111111111', 'Action', 'action', 'genre'),
('22222222-2222-2222-2222-222222222222', 'RPG', 'rpg', 'genre'),
('33333333-3333-3333-3333-333333333333', 'Cyberpunk', 'cyberpunk', 'theme'),
('44444444-4444-4444-4444-444444444444', 'Indie', 'indie', 'type'),
('55555555-5555-5555-5555-555555555555', 'Space', 'space', 'theme'),
('66666666-6666-6666-6666-666666666666', 'Retro', 'retro', 'style'),
('77777777-7777-7777-7777-777777777777', 'Racing', 'racing', 'genre'),
('88888888-8888-8888-8888-888888888888', 'Multiplayer', 'multiplayer', 'feature');
