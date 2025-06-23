import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useSubscription, useMutation } from "@apollo/client";
import { GET_ROOM } from "../graphql/queries";
import {
  PARTICIPANT_JOINED,
  PARTICIPANT_LEFT,
  PARTICIPANTS_UPDATED,
} from "../graphql/subscriptions";
import { LEAVE_ROOM } from "../graphql/mutations";
import { toast, Toaster } from "react-hot-toast";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_ROOM, {
    variables: { roomCode },
  });
  const [leaveRoom] = useMutation(LEAVE_ROOM);
  const participantId = localStorage.getItem("participantId");
  const [participants, setParticipants] = useState([]);

  // Initialize participants once room data is loaded
  useEffect(() => {
    if (data?.getRoom?.members) {
      console.log("Setting initial participants:", data.getRoom.members);
      setParticipants(data.getRoom.members);
    }
  }, [data]);

  const handleLeave = async () => {
    try {
      await leaveRoom({ variables: { roomCode, participantId } });
      localStorage.removeItem("participantId");
      localStorage.removeItem("roomCode");
      toast.success("Left room");
      navigate("/", { state: { refreshRooms: true } });
    } catch (err) {
      console.error(err);
      toast.error("Error leaving room");
    }
  };

  // Subscribe to participant joined events
  useSubscription(PARTICIPANT_JOINED, {
    variables: { roomCode },
    onSubscriptionData: ({ subscriptionData }) => {
      const newParticipant = subscriptionData.data.participantJoined;
      console.log("PARTICIPANT_JOINED received:", newParticipant);
      toast.success(`${newParticipant.name} joined!`);

    },
  });

  // Subscribe to participant left events
  useSubscription(PARTICIPANT_LEFT, {
    variables: { roomCode },
    onSubscriptionData: ({ subscriptionData }) => {
      const leftParticipant = subscriptionData.data.participantLeft;
      console.log("PARTICIPANT_LEFT received:", leftParticipant);

      // Avoid showing toast if I myself left
      if (leftParticipant.id === participantId) {
        return;
      }

      toast.success(`${leftParticipant.name} left the room.`);
    },
  });

  const { data: participantsUpdateData } = useSubscription(
    PARTICIPANTS_UPDATED,
    {
      variables: { roomCode },
    }
  );

  // This is the main subscription that handles all participant list updates
  useEffect(() => {
    if (participantsUpdateData?.participantsUpdated) {
      console.log(
        "Updating participants from subscription:",
        participantsUpdateData.participantsUpdated
      );
      setParticipants(participantsUpdateData.participantsUpdated);
    }
  }, [participantsUpdateData]);

  if (loading) return <p className="text-white">Loading room...</p>;
  if (error) return <p className="text-red-500">Error: {error.message}</p>;

  const room = data.getRoom;

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      <Toaster />
      <div className="p-6 flex justify-between items-center border-b border-green-600">
        <div>
          <h1 className="text-3xl font-bold text-green-400">
            {room.admin_id.name}'s Room
          </h1>
          <p>
            Code:{" "}
            <span className="font-mono text-green-300">{room.room_code}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-1">
        <div className="flex-1"></div> {/* Left side kept empty */}
        <div className="w-80 bg-[#1e1e1e] p-6 border-l border-green-700">
          <h2 className="text-xl font-bold mb-4 text-green-400">
            Participants ({participants.length})
          </h2>
          <ul className="space-y-2">
            {participants.map((participant) => (
              <li key={participant.id} className="text-white">
                {participant.name}
                {participant.id === participantId && (
                  <span className="text-green-400 ml-2">(You)</span>
                )}
              </li>
            ))}
          </ul>
          {participants.length === 0 && (
            <p className="text-gray-400 italic">No participants yet...</p>
          )}
        </div>
      </div>

      <div className="p-6">
        <button
          onClick={handleLeave}
          className="bg-red-600 px-6 py-3 rounded-lg font-bold hover:bg-red-700"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
