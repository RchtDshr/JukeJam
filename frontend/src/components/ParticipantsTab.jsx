import Participants from "./Participants";

export default function ParticipantsTab({
  roomCode,
  participantId,
  initialParticipants,
  participants,
  setParticipants,
  roomAdminId
}) {
  return (
    <div className="space-y-3">
  
      <Participants
        roomCode={roomCode}
        participantId={participantId}
        initialParticipants={initialParticipants}
        participants={participants}
        setParticipants={setParticipants}
        roomAdminId={roomAdminId}
      />
    </div>
  );
}