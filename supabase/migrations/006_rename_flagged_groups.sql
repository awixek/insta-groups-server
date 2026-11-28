-- Migration 006 — optional, run ONCE. Renames the 7 listings that Google's AdSense review flagged
-- (profanity / "dark discussion" / "gibberish" / personal Instagram handle) to clean, family-friendly names.
-- Matching is done on the OLD names (case-insensitive). The result table at the bottom shows what changed.
-- Prefer to do it by hand? Admin panel -> All groups -> "Rename" / "Edit text" buttons do the same thing.

update public.groups set name = 'Midnight Thinkers',
       description = 'Casual chats about life, ideas and random thoughts. Everyone is welcome.', ai_description = null
 where name ilike '%failed abrptsions%';

update public.groups set name = 'Big Dreams Club',
       description = 'A friendly group for people with big goals to share ideas and motivate each other.', ai_description = null
 where name ilike '%lil dih big dreams%';

update public.groups set name = 'Chai Pe Charcha',
       description = 'Relaxed Hindi and Hinglish chat about anything over a cup of chai.', ai_description = null
 where name ilike '%premium bakchod%';

update public.groups set name = 'Desi Squad Hangout',
       description = 'A friendly hangout for Desi friends to chat, share memes and make new friends.', ai_description = null
 where name ilike '%dalla janta party%';

update public.groups set name = 'Chat Buddies',
       description = 'A friendly group chat to meet new people and talk about anything you like.', ai_description = null
 where name ilike '%chat buster%';

update public.groups set name = 'Mystery Solvers Club',
       description = 'Riddles, puzzles and mystery stories. Join to solve them together.', ai_description = null
 where name ilike '%crime cartel%';

update public.groups set name = 'Weekend Vibes Gang',
       description = 'A chill group to hang out, chat and make new friends on weekends.', ai_description = null
 where name ilike '%its_tannu_bisht%';

select id, name, platform, status
  from public.groups
 where name in ('Midnight Thinkers','Big Dreams Club','Chai Pe Charcha','Desi Squad Hangout',
                'Chat Buddies','Mystery Solvers Club','Weekend Vibes Gang');
