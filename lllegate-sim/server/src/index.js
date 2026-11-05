import { app } from "./app.js";
import { config } from "./config.js";
import { diagnosticoRemitente, numerosDelWaba, whatsappDisponible } from "./security/whatsapp.js";

// Un error de configuración en el remitente del OTP era invisible para quien
// solo ve el log; se resuelve imprimiendo al arrancar los números que Meta
// reconoce en el WABA.
async function revisarRemitenteOtp() {
  if (!whatsappDisponible()) return;

  const { wabaId, phoneId } = config.otp.whatsapp;
  if (!wabaId) {
    console.log("[otp] WHATSAPP_WABA_ID no está configurado; no se puede verificar el remitente.");
    return;
  }

  try {
    const numeros = await numerosDelWaba({ wabaId });
    console.log(diagnosticoRemitente({ phoneId, numeros }));
  } catch (error) {
    console.log(`[otp] no se pudieron leer los números del WABA: ${error.message}`);
  }
}

const server = app.listen(config.port, () => {
  console.log(`Llégate API escuchando en http://localhost:${config.port}`);
  revisarRemitenteOtp();
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
