import { useState } from "react";
import { Clock, Users } from "lucide-react";
import QueueTab from "./QueueTab";
import ParticipantsTab from "./ParticipantsTab";

export default function SidePanel({ 
  roomCode, 
  participantId, 
  participants, 
  setParticipants, 
  roomAdminId, 
  initialParticipants 
}) {
  const [activeTab, setActiveTab] = useState("participants");

  return (
    <div className="bg-zinc-900 border border-green-800 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-green-800">
        <button
          onClick={() => setActiveTab("queue")}
          className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${
            activeTab === "queue"
              ? "bg-zinc-800 text-green-300 border-b-2 border-green-500"
              : "hover:bg-zinc-800 text-green-400"
          }`}
        >
          <Clock size={18} />
          Add Songs
        </button>
        <button
          onClick={() => setActiveTab("participants")}
          className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 ${
            activeTab === "participants"
              ? "bg-zinc-800 text-green-300 border-b-2 border-green-500"
              : "hover:bg-zinc-800 text-green-400"
          }`}
        >
          <Users size={18} />
          People ({participants?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "queue" && (
          <QueueTab roomCode={roomCode} />
        )}

        {activeTab === "participants" && (
          <ParticipantsTab
            roomCode={roomCode}
            participantId={participantId}
            initialParticipants={initialParticipants}
            participants={participants}
            setParticipants={setParticipants}
            roomAdminId={roomAdminId}
          />
        )}
      </div>
    </div>
  );
}