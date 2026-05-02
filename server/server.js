import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

function analyzeUser(text) {
  const lower = text.toLowerCase();

  if (lower.includes("код") || /\d{3,}/.test(lower)) {
    return {
      correct: false,
      analysis: "❌ Ошибка! Нельзя передавать коды и данные.",
    };
  }

  if (
    lower.includes("нет") ||
    lower.includes("не скажу") ||
    lower.includes("мошен") ||
    lower.includes("блокирую") ||
    lower.includes("полиция")
  ) {
    return {
      correct: true,
      analysis: "✅ Отлично! Ты правильно распознал мошенника.",
    };
  }

  return {
    correct: true,
    analysis: "⚠️ Лучше сразу прекратить разговор.",
  };
}

function generateScamMessage(step) {
  const messages = [
    "Это срочно! Подтвердите операцию.",
    "Если не ответите — деньги спишутся.",
    "Назовите код из СМС.",
    "Мы уже начали блокировку счета!",
    "Это служба безопасности, не игнорируйте.",
    "Скажите код прямо сейчас!",
    "У вас осталось 30 секунд!",
    "Это последняя попытка!",
    "Ваш счет под угрозой!",
    "Если не скажете код — потеряете деньги!",
  ];

  return messages[step % messages.length];
}

// 📡 API
app.post("/chat", (req, res) => {
  const { message, step = 0 } = req.body;

  const result = analyzeUser(message);
  const scam = generateScamMessage(step);

  const reply = `АНАЛИЗ: ${result.analysis}

МОШЕННИК: ${scam}`;

  res.json({
    reply,
    correct: result.correct,
  });
});

app.listen(3001, () => {
  console.log("Fake AI server running on http://localhost:3001");
});