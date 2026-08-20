import ParticipantsDetailClient from "./ParticipantsDetailClient";

interface ParticipantDetailPageProps {
  params: Promise<{
    participantEventId: string;
  }>;
}

export default async function ParticipantDetailPage({
  params,
}: ParticipantDetailPageProps) {
  const { participantEventId } = await params;

  return (
    <ParticipantsDetailClient
      participantEventId={participantEventId}
    />
  );
}
