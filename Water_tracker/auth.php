<?php
require_once 'db_connect.php';

session_start(); // 🔥 IMPORTANT: Start session at top
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit();
}

$action = $_POST['action'] ?? '';
$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

/* ================= REGISTER ================= */
if ($action === 'register') {

    $name = trim($_POST['name'] ?? '');

    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Please fill all required fields."]);
        exit();
    }

    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $name, $email, $password_hash);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Registration successful!"]);
    } else {
        if ($conn->errno == 1062) {
            echo json_encode(["success" => false, "message" => "Email already registered."]);
        } else {
            echo json_encode(["success" => false, "message" => "Registration failed."]);
        }
    }

    $stmt->close();
}

/* ================= LOGIN ================= */
else if ($action === 'login') {

    if (empty($email) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Please enter email and password."]);
        exit();
    }

    $stmt = $conn->prepare("SELECT id, name, password_hash FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {

        $user = $result->fetch_assoc();

        if (password_verify($password, $user['password_hash'])) {

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['logged_in'] = true;

            echo json_encode([
                "success" => true,
                "message" => "Login successful!",
                "user_name" => $user['name']
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "Incorrect password."]);
        }

    } else {
        echo json_encode(["success" => false, "message" => "Email not found."]);
    }

    $stmt->close();
}

else {
    echo json_encode(["success" => false, "message" => "Invalid action."]);
}

$conn->close();
?>
