import React, { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useSubscription, useMutation } from "@apollo/client";
import { GET_ROOM } from "../graphql/queries";
import { PARTICIPANT_JOINED } from "../graphql/subscriptions";
import { LEAVE_ROOM } from "../graphql/mutations";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_ROOM, {
    variables: { roomCode },
  });
  const [leaveRoomMutation] = useMutation(LEAVE_ROOM);

  const handleLeaveRoom = async () => {
    const participantId = localStorage.getItem("participantId");
    try {
      const response = await leaveRoomMutation({
        variables: { roomCode, participantId },
      });
      const leftParticipant = response.data.leaveRoom;
      console.log(`${leftParticipant.name} has left the room`);
      localStorage.removeItem("participantId"); 
      // navigate away after successful leave
      navigate("/");
    } catch (error) {
      console.error("Error leaving room:", error.message);
    }
  };

  console.log("Subscribing with roomCode:", roomCode);

  // Listen to subscription with error handling
  const {
    data: subscriptionData,
    loading: subscriptionLoading,
    error: subscriptionError,
  } = useSubscription(PARTICIPANT_JOINED, {
    variables: { roomCode },
    onSubscriptionData: ({ subscriptionData }) => {
      console.log("Received subscription data:", subscriptionData);
    },
    onError: (error) => {
      console.error("Subscription error:", error);
    },
  });

  // Debug subscription state
  useEffect(() => {
    console.log("Subscription loading:", subscriptionLoading);
    console.log("Subscription error:", subscriptionError);
    console.log("Subscription data:", subscriptionData);
  }, [subscriptionLoading, subscriptionError, subscriptionData]);

  // Whenever subscription fires, show notification
  useEffect(() => {
    if (subscriptionData?.participantJoined) {
      const newParticipant = subscriptionData.participantJoined;
      console.log("New participant joined:", newParticipant);

      // Optional: Avoid showing notification for the current user
      // if (currentUserRef.current && newParticipant.id === currentUserRef.current.id) {
      //   return;
      // }

      // Show notification
      alert(`${newParticipant.name} joined the room!`);

      // Alternative: Use a toast library like react-hot-toast
      // toast.success(`${newParticipant.name} joined the room!`);
    }
  }, [subscriptionData]);

  if (loading) return <p className="text-white">Loading room...</p>;
  if (error) return <p className="text-red-500">Error: {error.message}</p>;

  const room = data.getRoom;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold text-green-500 mb-4">
        {room.admin_id.name}'s Room
      </h1>
      <p>
        Room Code: <span className="font-mono">{room.room_code}</span>
      </p>

      {/* Debug subscription status */}
      <div className="mt-4 p-2 bg-gray-800 rounded text-sm">
        <p>Subscription Status:</p>
        <p>Loading: {subscriptionLoading ? "Yes" : "No"}</p>
        <p>Error: {subscriptionError ? subscriptionError.message : "None"}</p>
        <p>Data: {subscriptionData ? "Receiving" : "Waiting"}</p>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Participants</h2>
        <ul className="list-disc list-inside">
          {room.members.map((member) => (
            <li key={member.id}>{member.name}</li>
          ))}
        </ul>
      </div>
      <button
        className="bg-green-800 p-2 text-white text-xl font-semibold "
        onClick={handleLeaveRoom}
      >
        {" "}
        Leave Room
      </button>
    </div>
  );
}
