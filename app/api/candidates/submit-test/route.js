import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../api/db/db.js';

export async function POST(request) {
  try {
    const data = await request.json();
    const { testId, candidateId, candidateAnswers } = data;

    if (!testId || !candidateId || !candidateAnswers) {
      return NextResponse.json({ success: false, error: 'Missing required parameters.' }, { status: 400 });
    }

    const db = await getDbConnection();
    
    const [tests] = await db.execute(`SELECT * FROM candidate_tests WHERE id = ? AND candidate_employee_id = ? LIMIT 1`, [testId, candidateId]);
    
    if (tests.length === 0) {
      return NextResponse.json({ success: false, error: 'Test not found.' }, { status: 404 });
    }

    const test = tests[0];

    if (test.status === 'Completed') {
      return NextResponse.json({ success: false, error: 'Test already completed.' }, { status: 400 });
    }

    if (test.test_type !== 'mcq') {
      return NextResponse.json({ success: false, error: 'This test does not support auto-grading.' }, { status: 400 });
    }

    const mcqData = typeof test.test_data === 'string' ? JSON.parse(test.test_data) : test.test_data;

    let score = 0;
    const evaluatedData = mcqData.map((question, index) => {
      const candidateChoice = candidateAnswers[index];
      const isCorrect = candidateChoice === question.correctIndex;
      if (isCorrect) score += 1;
      return {
        ...question,
        candidateChoice,
        isCorrect
      };
    });

    const finalScore = `${score} / ${mcqData.length}`;

    // Update test
    await db.execute(
      `UPDATE candidate_tests SET status = 'Completed', test_data = ? WHERE id = ?`,
      [JSON.stringify(evaluatedData), testId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Test submitted successfully!',
      score: finalScore
    });

  } catch (error) {
    console.error('Submit Test API Error:', error);
    return NextResponse.json({ success: false, error: 'Server error processing test submission' }, { status: 500 });
  }
}
