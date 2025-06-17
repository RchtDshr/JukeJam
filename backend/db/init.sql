-- PARTICIPANTS (INCLUDES DUMMY USERS)
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ROOMS TABLE (no foreign keys yet)
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  admin_id UUID NOT NULL,
  current_song_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PARTICIPANT-ROOM RELATION (Each participant can only be in one room)
CREATE TABLE IF NOT EXISTS room_members (
  participant_id UUID PRIMARY KEY,
  room_id UUID NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member')) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- SONG QUEUE
CREATE TABLE IF NOT EXISTS song_queue (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL,
  added_by UUID NOT NULL,
  youtube_url TEXT NOT NULL,
  title TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- NOW ADD FOREIGN KEY CONSTRAINTS

-- rooms.admin_id references participants
ALTER TABLE rooms
ADD CONSTRAINT fk_rooms_admin
FOREIGN KEY (admin_id) REFERENCES participants(id)
ON DELETE CASCADE;

-- rooms.current_song_id references song_queue
ALTER TABLE rooms
ADD CONSTRAINT fk_rooms_current_song
FOREIGN KEY (current_song_id) REFERENCES song_queue(id);

-- room_members.participant_id references participants
ALTER TABLE room_members
ADD CONSTRAINT fk_room_members_participant
FOREIGN KEY (participant_id) REFERENCES participants(id)
ON DELETE CASCADE;

-- room_members.room_id references rooms
ALTER TABLE room_members
ADD CONSTRAINT fk_room_members_room
FOREIGN KEY (room_id) REFERENCES rooms(id)
ON DELETE CASCADE;

-- song_queue.room_id references rooms
ALTER TABLE song_queue
ADD CONSTRAINT fk_song_queue_room
FOREIGN KEY (room_id) REFERENCES rooms(id)
ON DELETE CASCADE;

-- song_queue.added_by references participants
ALTER TABLE song_queue
ADD CONSTRAINT fk_song_queue_added_by
FOREIGN KEY (added_by) REFERENCES participants(id)
ON DELETE CASCADE;
