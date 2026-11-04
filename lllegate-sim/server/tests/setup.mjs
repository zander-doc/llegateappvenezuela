// Valores por defecto para las pruebas. El archivo de pruebas de API los
// sobrescribe con el puerto real del clúster embebido antes de importar la app.
process.env.AUTH_JWT_SECRET ||= "secreto-solo-pruebas";
process.env.DATABASE_URL ||= "postgres://postgres:postgres@localhost:55432/llegate_test";
process.env.PUBLIC_API_URL ||= "http://127.0.0.1:4399";
process.env.STORAGE_DRIVER ||= "local";
process.env.STORAGE_LOCAL_DIR ||= ".storage-test";
process.env.OTP_LOG_EN_DESARROLLO ||= "1";
process.env.NODE_ENV ||= "test";
