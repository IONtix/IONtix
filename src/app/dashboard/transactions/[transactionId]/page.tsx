import TransactionsDetailClient from "./TransactionsDetailClient";

interface TransactionDetailPageProps {
  params: Promise<{
    transactionId: string;
  }>;
}

export default async function TransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  const { transactionId } = await params;

  return (
    <TransactionsDetailClient
      transactionId={transactionId}
    />
  );
}
