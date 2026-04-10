/*
 * ESP32 Fingerprint Attendance System
 * Modes: 
 * 1. Enroll: Register new fingerprints to the sensor memory
 * 2. Attendance: Scan and send ID to the server
 * 
 * Libraries needed: 
 * - Adafruit Fingerprint Sensor Library
 * - ArduinoJson
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Fingerprint.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// API Configuration
const char* serverUrl = "http://192.168.x.x:3000/api/absen"; // Change to your server IP
const char* apiKey = "fingerprint_secret_key";

// Fingerprint Sensor Configuration
// ESP32 Pins: RX=16, TX=17 (Serial2)
#define mySerial Serial2
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

int operatingMode = 0; // 1: Enroll, 2: Attendance

void setup() {
  Serial.begin(115200);
  while (!Serial); // Wait for serial monitor
  delay(100);
  
  mySerial.begin(57600, SERIAL_8N1, 16, 17);

  Serial.println("\n\n--- Sistem Absensi Sekolah ESP32 ---");

  // Initialize Fingerprint Sensor
  if (finger.verifyPassword()) {
    Serial.println("Sensor sidik jari ditemukan!");
  } else {
    Serial.println("Sensor sidik jari TIDAK ditemukan :(");
    while (1) { delay(1); }
  }

  // Select Mode
  Serial.println("\nPilih Mode Pengoperasian:");
  Serial.println("1. Enroll (Daftarkan Sidik Jari Baru)");
  Serial.println("2. Attendance (Mode Absensi & Kirim Data)");
  Serial.print("Masukkan pilihan (1/2): ");

  while (operatingMode == 0) {
    if (Serial.available()) {
      char choice = Serial.read();
      if (choice == '1') operatingMode = 1;
      else if (choice == '2') operatingMode = 2;
    }
    delay(10);
  }
  
  Serial.println(operatingMode);
  
  if (operatingMode == 2) {
    // Connect to WiFi only if in Attendance mode
    Serial.print("Menghubungkan ke WiFi: ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("\nWiFi Terhubung!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  }

  Serial.println("\n--- Sistem Siap ---");
}

void loop() {
  if (operatingMode == 1) {
    enrollMode();
  } else if (operatingMode == 2) {
    attendanceMode();
  }
}

// --- MODE: ATTENDANCE ---
void attendanceMode() {
  int fingerId = getFingerprintID();
  if (fingerId > 0) {
    sendAttendance(fingerId);
    delay(2000); // Jeda agar tidak terhitung double scan
  }
  delay(50);
}

int getFingerprintID() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) {
    Serial.println("Sidik jari tidak dikenali!");
    return -1;
  }

  Serial.print("Ditemukan ID #"); Serial.print(finger.fingerID);
  Serial.print(" dengan kepercayaan "); Serial.println(finger.confidence);
  return finger.fingerID;
}

void sendAttendance(int id) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);

    StaticJsonDocument<200> doc;
    doc["finger_id"] = id;
    // doc["timestamp"] is removed so server uses its own current time

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("Respon Server: ");
      Serial.println(response);
    } else {
      Serial.print("Gagal kirim data. Error: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}

// --- MODE: ENROLL ---
void enrollMode() {
  Serial.println("\n--- Mode Pendaftaran (Enroll) ---");
  Serial.println("Ketikkan ID (1-127) yang ingin didaftarkan...");
  
  uint16_t id = readIDFromSerial();
  if (id == 0) return; // ID 0 is invalid
  
  Serial.print("Mendaftarkan ID #");
  Serial.println(id);
  
  while (!getFingerprintEnroll(id));
}

uint16_t readIDFromSerial() {
  uint16_t id = 0;
  while (id == 0) {
    while (!Serial.available());
    id = Serial.parseInt();
  }
  return id;
}

uint8_t getFingerprintEnroll(uint16_t id) {
  int p = -1;
  Serial.print("Tempelkan jari untuk ID #"); Serial.println(id);
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
      case FINGERPRINT_OK: Serial.println("Gambar diambil"); break;
      case FINGERPRINT_NOFINGER: Serial.print("."); break;
      default: Serial.println("Error saat mengambil gambar"); break;
    }
  }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) return false;
  
  Serial.println("Angkat jari...");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
  }
  
  p = -1;
  Serial.println("Tempelkan jari yang SAMA lagi...");
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
      case FINGERPRINT_OK: Serial.println("Gambar diambil"); break;
      case FINGERPRINT_NOFINGER: Serial.print("."); break;
      default: Serial.println("Error saat mengambil gambar"); break;
    }
  }

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) return false;
  
  p = finger.createModel();
  if (p == FINGERPRINT_OK) {
    Serial.println("Model sidik jari cocok!");
  } else {
    Serial.println("Sidik jari TIDAK cocok!");
    return false;
  }
  
  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.println("Berhasil disimpan!");
    return true;
  } else {
    Serial.println("Gagal menyimpan ke memori sensor!");
    return false;
  }
}
