<?php

// ❗ ERRORlarni yashiramiz (JSON buzilmasligi uchun)
ini_set('display_errors', 0);
error_reporting(0);

header("Content-Type: application/json; charset=utf-8");

// 🔥 buffer (ortiqcha chiqishni oldini oladi)
ob_start();

// 🔐 API KEY (config.php dan)
$config = require "config.php";
$api_key = $config["MISTRAL_API_KEY"] ?? "";

// ❗ INPUT
$raw_input = file_get_contents("php://input");
$data = json_decode($raw_input, true);

$message = $data["message"] ?? "";

// 🔥 UTF-8 normalize
$message = mb_convert_encoding($message, "UTF-8", "UTF-8");

// ❗ API endpoint
$url = "https://api.mistral.ai/v1/conversations";

// ❗ REQUEST DATA
$postData = [
  "agent_id" => "ag_019d4568d82d75a9b13d78ecbecf09a6",
  "agent_version" => 1, // 🔥 MUHIM
  "inputs" => [
    ["role" => "user", "content" => $message]
  ]
];

// 🔧 cURL init
$ch = curl_init($url);

curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "Authorization: Bearer $api_key"
  ],
  CURLOPT_POSTFIELDS => json_encode($postData, JSON_UNESCAPED_UNICODE),
  CURLOPT_SSL_VERIFYPEER => false,
  CURLOPT_SSL_VERIFYHOST => false,
]);

$response = curl_exec($ch);

// ❗ cURL error
if ($response === false) {
  ob_clean();
  echo json_encode([
    "reply" => "cURL error: " . curl_error($ch)
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// ❗ JSON decode
$result = json_decode($response, true);

// 🔥 UNIVERSAL PARSER
$reply = "No response";

if (isset($result["outputs"]) && count($result["outputs"]) > 0) {
  $output = $result["outputs"][0];

  // CASE 1: string
  if (isset($output["content"]) && is_string($output["content"])) {
    $reply = $output["content"];
  }

  // CASE 2: array format
  elseif (isset($output["content"]) && is_array($output["content"])) {
    $texts = [];
    foreach ($output["content"] as $item) {
      if (isset($item["text"])) {
        $texts[] = $item["text"];
      }
    }
    $reply = implode("", $texts);
  }

  // CASE 3: fallback
  elseif (isset($output["message"]["content"])) {
    $reply = $output["message"]["content"];
  }
}

// 🔥 CLEAN (code block uchun muhim)
$reply = str_replace("\0", "", $reply);

// 🔥 BUFFER tozalash
ob_clean();

// 🔥 FINAL JSON (eng muhim qator)
echo json_encode([
  "reply" => $reply
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);