import React, { useEffect } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_SONG_QUEUE } from '../graphql/queries';
import { SONG_QUEUE_UPDATED } from '../graphql/subscriptions';

const Queue = ({ roomCode }) => {
  const { data, loading, error, refetch } = useQuery(GET_SONG_QUEUE, {
    variables: { roomCode }
  });

  const { data: subscriptionData } = useSubscription(SONG_QUEUE_UPDATED, {
    variables: { roomCode }
  });

  useEffect(() => {
    if (subscriptionData) {
      refetch();
    }
  }, [subscriptionData, refetch]);

  if (loading) return <p>Loading queue...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>Current Queue</h2>
      <ul>
        {data.getSongQueue.map(song => (
          <li key={song.id}>
            <a href={song.youtube_url} target="_blank" rel="noopener noreferrer">{song.title}</a> 
            — Added by {song.added_by?.name || 'Unknown'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Queue;
