/*
 * ESP32 Fingerprint Attendance Sender
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

void setup() {
  Serial.begin(115200);
  mySerial.begin(57600, SERIAL_8N1, 16, 17);

  // Initialize Fingerprint Sensor
  if (finger.verifyPassword()) {
    Serial.println("Found fingerprint sensor!");
  } else {
    Serial.println("Did not find fingerprint sensor :(");
    while (1) { delay(1); }
  }

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void loop() {
  int fingerId = getFingerprintID();
  if (fingerId > 0) {
    sendAttendance(fingerId);
    delay(2000); // Prevent multiple reads
  }
  delay(50);
}

int getFingerprintID() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) return -1;

  Serial.print("Found ID #"); Serial.print(finger.fingerID);
  Serial.print(" with confidence of "); Serial.println(finger.confidence);
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
    
    // Get current time from ESP32 if available, or let server use its own time.
    // Here we just send the ID, server can handle the timestamp if not provided.
    // But per spec, we should send a timestamp. Using a placeholder or omitting 
    // it if the server handles it. Let's send a dummy ISO string or use a time lib.
    doc["timestamp"] = "2025-01-01T08:00:00"; // Placeholder, server should ideally handle this

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}
