// question/[questionIndex]/page.tsx

interface Props {
  params: Promise<{
    questionIndex: string;
  }>;
}

export default async function QuestionPage({
  params,
}: Props) {
  const { questionIndex } = await params;

  const index = Number.parseInt(
    questionIndex,
    10
  );

  return (
    <div data-question-index={index}>
      {/* TestSessionPage ichidagi children */}
    </div>
  );
}