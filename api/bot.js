export default async function handler(req, res) {

  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!BOT_TOKEN) {
    return res.status(200).json({
      ok: false,
      error: "BOT_TOKEN not found"
    });
  }

  if (req.method !== "POST") {
    return res.status(200).send(
      "DogAtlas bot is working"
    );
  }

  const update = req.body;

  try {

    /* =========================
       КНОПКА "ЕЩЁ СОБАКУ"
    ========================= */

    if (update.callback_query) {

      const callback = update.callback_query;

      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            callback_query_id: callback.id
          })
        }
      );

      if (callback.data === "more_dog") {

        const chatId =
          callback.message.chat.id;

        await sendPrettyDog(
          chatId,
          BOT_TOKEN
        );

      }

      return res.status(200).json({
        ok: true
      });
    }


    /* =========================
       ОБЫЧНЫЕ СООБЩЕНИЯ
    ========================= */

    if (!update.message) {

      return res.status(200).json({
        ok: true
      });

    }

    const chatId =
      update.message.chat.id;

    const text =
      (update.message.text || "")
        .trim()
        .toLowerCase();


    /* =========================
       /DOG
    ========================= */

    if (text.startsWith("/dog")) {

      await sendPrettyDog(
        chatId,
        BOT_TOKEN
      );

      return res.status(200).json({
        ok: true
      });
    }


    /* =========================
       /START
    ========================= */

    if (text.startsWith("/start")) {

      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              "Привет! Я ДогАтлас 🐶\n\n" +
              "Напиши /dog — и я пришлю тебе красивую собаку.",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Открыть ДогАтлас",
                    web_app: {
                      url: "https://dogatlas.vercel.app"
                    }
                  }
                ]
              ]
            }
          })
        }
      );

      return res.status(200).json({
        ok: true
      });
    }


    /* =========================
       /HELP
    ========================= */

    if (text.startsWith("/help")) {

      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              "Команды ДогАтласа 🐾\n\n" +
              "/dog — прислать собаку\n" +
              "/start — открыть меню\n" +
              "/help — список команд"
          })
        }
      );

      return res.status(200).json({
        ok: true
      });
    }


    /* =========================
       ЕСЛИ НАПИСАЛИ ЧТО-ТО ДРУГОЕ
    ========================= */

    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            "Напиши /dog — и я пришлю тебе собаку 🐶"
        })
      }
    );

    return res.status(200).json({
      ok: true
    });

  }

  catch (error) {

    console.error(
      "Bot error:",
      error
    );

    return res.status(200).json({
      ok: true
    });
  }
}


/* =========================================
   ОТПРАВКА БОЛЕЕ КРАСИВОЙ СОБАКИ
========================================= */

async function sendPrettyDog(
  chatId,
  BOT_TOKEN
) {

  const prettyBreeds = [

    {
      api: "retriever/golden",
      name: "Золотистый ретривер"
    },

    {
      api: "samoyed",
      name: "Самоед"
    },

    {
      api: "shiba",
      name: "Сиба-ину"
    },

    {
      api: "husky",
      name: "Хаски"
    },

    {
      api: "pomeranian",
      name: "Померанский шпиц"
    },

    {
      api: "poodle/miniature",
      name: "Миниатюрный пудель"
    },

    {
      api: "spaniel/cocker",
      name: "Кокер-спаниель"
    },

    {
      api: "labrador",
      name: "Лабрадор"
    },

    {
      api: "papillon",
      name: "Папильон"
    },

    {
      api: "maltese",
      name: "Мальтезе"
    }

  ];


  let dog = null;


  /* =========================
     ПРОБУЕМ ДО 5 РАЗ
  ========================= */

  for (
    let attempt = 0;
    attempt < 5;
    attempt++
  ) {

    try {

      const breed =
        prettyBreeds[
          Math.floor(
            Math.random()
            *
            prettyBreeds.length
          )
        ];

      const dogResponse =
        await fetch(
          `https://dog.ceo/api/breed/${breed.api}/images/random`
        );

      const dogData =
        await dogResponse.json();

      if (
        dogData.status === "success"
        &&
        dogData.message
      ) {

        dog = {
          photo: dogData.message,
          breed: breed.name
        };

        break;
      }

    }

    catch (error) {

      console.log(
        "Ошибка получения фото:",
        error
      );

    }

  }


  /* =========================
     ЕСЛИ НЕ НАШЛИ ФОТО
  ========================= */

  if (!dog) {

    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            "Собачка куда-то убежала 🐕 Попробуй ещё раз!"
        })
      }
    );

    return;
  }


  /* =========================
     ОТПРАВЛЯЕМ ФОТО
  ========================= */

  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo: dog.photo,
        caption:
          `Твоя собака на сегодня 🐶💛\n` +
          `Порода: ${dog.breed}`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Ещё собаку 🐾",
                callback_data: "more_dog"
              }
            ],
            [
              {
                text: "Открыть ДогАтлас",
                web_app: {
                  url:
                    "https://dogatlas.vercel.app"
                }
              }
            ]
          ]
        }
      })
    }
  );
}