<?php
require_once 'db_connect.php';
// Start session to access user_id
session_start();
// Set response header to JSON
header('Content-Type: application/json');
// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); // Unauthorized
    echo json_encode(["success" => false, "message" => "User not logged in."]);
    exit();
}
$user_id = $_SESSION['user_id'];
$action = $_POST['action'] ?? $_GET['action'] ?? '';
// --- SET TARGET ---
if ($action === 'set_target' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $target = intval($_POST['target'] ?? 0);

    if ($target <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid target value."]);
        exit();
    }
    $stmt = $conn->prepare("UPDATE users SET weekly_target = ? WHERE id = ?");
    $stmt->bind_param("ii", $target, $user_id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Target updated."]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to update target."]);
    }
    $stmt->close();
}
// --- SAVE USAGE DATA ---
else if ($action === 'save_usage' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $total_usage = intval($_POST['total_usage'] ?? 0);
    $date = date('Y-m-d'); // Current date
    if ($total_usage <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid usage value."]);
        exit();
    }

    // Check if data for today already exists (optional: prevent duplicate daily entries)
    // For simplicity, we just insert. A better system would check and update/delete.

    $stmt = $conn->prepare("INSERT INTO water_dataa (user_id, total_usage, date) VALUES (?, ?, ?)");
    $stmt->bind_param("iis", $user_id, $total_usage, $date);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Usage saved successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to save usage."]);
    }
    $stmt->close();
}

// --- FETCH DATA (Target & Last Usage) ---
else if ($action === 'fetch_data' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = ["target" => 0, "last_usage" => null, "user_name" => $_SESSION['user_name']];

    // 1. Fetch Weekly Target
    $stmt = $conn->prepare("SELECT weekly_target FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($user = $result->fetch_assoc()) {
        $data['target'] = $user['weekly_target'];
    }
    $stmt->close();

    // 2. Fetch Last Saved Usage (excluding today's entry if any)
    $stmt = $conn->prepare("SELECT total_usage FROM water_dataa WHERE user_id = ? AND date < CURDATE() ORDER BY date DESC LIMIT 1");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($last_usage = $result->fetch_assoc()) {
        $data['last_usage'] = $last_usage['total_usage'];
    }
    $stmt->close();

    echo json_encode(["success" => true, "data" => $data]);
}

// --- LOGOUT ---
else if ($action === 'logout') {
    session_destroy();
    echo json_encode(["success" => true, "message" => "Logged out successfully."]);
}

// --- FALLBACK ---
else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid action or request method."]);
}

$conn->close();
?>