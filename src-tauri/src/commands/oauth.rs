use reqwest::Client;
use std::io::{Read, Write};
use std::net::TcpListener;

#[tauri::command]
pub async fn start_oauth_server() -> Result<String, String> {
    tokio::task::spawn_blocking(|| {
        let listener = TcpListener::bind("127.0.0.1:34852").map_err(|e| e.to_string())?;
        
        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let mut buffer = [0; 2048];
                if let Ok(size) = stream.read(&mut buffer) {
                    let request = String::from_utf8_lossy(&buffer[..size]);
                    
                    if request.contains("cancel=true") {
                        let _ = stream.write_all(b"HTTP/1.1 200 OK\r\n\r\n");
                        return Err("Cancelled by user".to_string());
                    }
                    
                    if request.starts_with("GET ") && request.contains("code=") {
                        let first_line = request.lines().next().unwrap_or("");
                        if let Some(start) = first_line.find("code=") {
                            let code_start = start + 5;
                            if let Some(end) = first_line[code_start..].find(|c: char| c == ' ' || c == '&') {
                                let code = &first_line[code_start..code_start + end];
                                
                                let html = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n\
                                <!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Authentication Successful</title>\
                                <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'); \
                                body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #09090b; color: #ffffff; } \
                                .container { text-align: center; padding: 48px 40px; background: #18181b; border: 1px solid #27272a; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); max-width: 400px; animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); } \
                                .icon { width: 80px; height: 80px; background: rgba(0,208,156,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; } \
                                .icon svg { width: 40px; height: 40px; color: #00d09c; } \
                                h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: -0.5px; } \
                                p { font-size: 15px; color: #a1a1aa; line-height: 1.6; margin: 0 0 32px 0; } \
                                .btn { display: inline-block; background: #00d09c; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; transition: all 0.2s ease; cursor: pointer; border: none; } \
                                .btn:hover { background: #00b889; transform: translateY(-1px); } \
                                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }</style></head>\
                                <body><div class=\"container\"><div class=\"icon\">\
                                <svg fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.5\" d=\"M5 13l4 4L19 7\"></path></svg>\
                                </div><h1>Authentication Successful</h1><p>Oxide SEO has securely connected to your Google account. You can now close this window and return to the app.</p>\
                                <button class=\"btn\" onclick=\"window.close()\">Close Window</button></div>\
                                <script>setTimeout(() => window.close(), 3000);</script></body></html>";
                                
                                let _ = stream.write_all(html.as_bytes());
                                return Ok(code.to_string());
                            }
                        }
                    }
                    
                    let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\n\r\n");
                }
            }
        }
        
        Err("Listener closed unexpectedly".to_string())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn exchange_oauth_token(code: String, client_id: String, client_secret: String, redirect_uri: String) -> Result<String, String> {
    let client = Client::new();
    let params = [
        ("code", code),
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("redirect_uri", redirect_uri),
        ("grant_type", "authorization_code".to_string()),
    ];

    let res = client.post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    res.text().await.map_err(|e| e.to_string())
}
