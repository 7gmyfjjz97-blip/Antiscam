export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Метод не поддерживается"
    });
  }

  try {
    const {
      theme,
      level,
      history = [],
      userAnswer = null
    } = req.body || {};

    const themeNames = {
      bank: "Банк",
      police: "Милиция",
      hospital: "Больница",
      government: "Госслужбы",
      telecom: "Оператор связи",
      family: "Родственник",
      boss: "Начальник",
      shop: "Магазин",
      delivery: "Доставка",
      lottery: "Лотерея"
    };

    const levelNames = {
      easy: "Легкий",
      medium: "Средний",
      hard: "Сложный",
      expert: "Эксперт",
      hardcore: "Хардкор"
    };

    const themeName = themeNames[theme] || "Банк";
    const levelName = levelNames[level] || "Легкий";

    const systemPrompt = `
Ты — игровой AI-мошенник для образовательного тренажёра AntiScam.

Твоя задача — вести реалистичный учебный диалог, в котором ты ИГРАЕШЬ РОЛЬ МОШЕННИКА.

Тема:
${themeName}

Уровень:
${levelName}

ВАЖНЫЕ ПРАВИЛА ИГРЫ:

1. Каждый новый диалог должен быть новым.
2. Не копируй предыдущие сообщения дословно.
3. Мошенник должен использовать психологическое давление, срочность,
   страх, авторитет, заманчивое предложение или другие характерные
   признаки мошенничества в зависимости от выбранной темы.
4. Не делай каждый диалог одинаковым.
5. Постепенно развивай ситуацию.
6. Не сообщай ученику заранее, что именно является правильным ответом.
7. Не объясняй правильный ответ, если ученик ответил правильно.
8. Если ученик выбрал безопасный ответ — игра продолжается.
9. Если ученик совершил опасную ошибку — игра заканчивается.
10. При ошибке обязательно объясни конкретно, почему именно этот ответ
    был опасным.
11. Объяснение должно быть понятным школьнику.
12. Не используй реальные персональные данные.
13. Не проси настоящие пароли или реальные данные пользователя.
14. Все коды, номера карт и данные в примерах должны быть вымышленными.
15. Варианты ответов должны быть реалистичными и отличаться друг от друга.
16. Среди вариантов должен быть безопасный вариант и несколько опасных.
17. Не делай безопасным ответом всегда вариант №1.
18. Перемешивание вариантов будет выполняться приложением.

КРИТИЧЕСКОЕ ПРАВИЛО:

Если ученик выбирает безопасный вариант:
- correct = true
- gameOver = false
- explanation = null
- сгенерируй следующую реплику мошенника
- сгенерируй 4 новых варианта ответа

Если ученик выбирает опасный вариант:
- correct = false
- gameOver = true
- nextScammerMessage = null
- объясни конкретную ошибку
- новых вариантов не создавай

Ответ должен быть ТОЛЬКО JSON по указанной структуре.
`;

    let userPrompt;

    if (!userAnswer) {
      userPrompt = `
Начинаем новый игровой диалог.

Сгенерируй первое сообщение мошенника и 4 варианта ответа ученика.

История пока отсутствует.
`;
    } else {
      userPrompt = `
Продолжи текущий игровой диалог.

Последние сообщения:
${JSON.stringify(history, null, 2)}

Ответ ученика:
"${userAnswer}"

Определи, является ли ответ безопасным.

Если безопасный — продолжи разговор новым сообщением мошенника
и создай 4 новых варианта ответа.

Если опасный — закончи игру и объясни ошибку.
`;
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://antiscam-eight.vercel.app",
          "X-OpenRouter-Title": "AntiScam"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          temperature: 0.9,
          max_tokens: 1200,

          response_format: {
            type: "json_schema",
            json_schema: {
              name: "antiscam_turn",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  scammerMessage: {
                    type: ["string", "null"]
                  },

                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: {
                          type: "string"
                        },
                        safe: {
                          type: "boolean"
                        },
                        explanation: {
                          type: ["string", "null"]
                        }
                      },
                      required: [
                        "text",
                        "safe",
                        "explanation"
                      ],
                      additionalProperties: false
                    }
                  },

                  correct: {
                    type: "boolean"
                  },

                  gameOver: {
                    type: "boolean"
                  },

                  explanation: {
                    type: ["string", "null"]
                  }
                },

                required: [
                  "scammerMessage",
                  "options",
                  "correct",
                  "gameOver",
                  "explanation"
                ],

                additionalProperties: false
              }
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("OpenRouter error:", errorText);

      return res.status(500).json({
        error: "Ошибка обращения к AI",
        details: errorText
      });
    }

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        error: "AI не вернул ответ"
      });
    }

    let result;

    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parse error:", content);

      return res.status(500).json({
        error: "AI вернул некорректный JSON"
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("SERVER ERROR:", error);

    return res.status(500).json({
      error: "Внутренняя ошибка сервера"
    });
  }
}