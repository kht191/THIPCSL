# Load Testing với k6

## 📋 Giới thiệu

**k6** là công cụ load testing hiện đại, miễn phí, viết script bằng JavaScript.

**Ưu điểm:**
- ✅ Nhẹ, nhanh
- ✅ Viết script bằng JavaScript (dễ học)
- ✅ Báo cáo đẹp, real-time
- ✅ CLI-friendly, tích hợp CI/CD

---

## 🔧 Cài đặt k6

### **Windows:**

**Cách 1: Chocolatey (Khuyên dùng)**
```powershell
choco install k6
```

**Cách 2: Download trực tiếp**
1. Tải từ: https://k6.io/docs/get-started/installation/
2. Giải nén và thêm vào PATH

**Kiểm tra:**
```powershell
k6 version
```

---

## 🚀 Sử dụng

### **1. Chạy load test cơ bản**

```powershell
k6 run load-test.js
```

**Output:**
```
     ✓ checks.........................: 98.50%
     ✓ http_req_duration..............: avg=245ms p(95)=1.2s
     ✓ http_reqs......................: 5000 (83.3/s)
     ✓ errors.........................: 1.50%
```

---

### **2. Tùy chỉnh số lượng users**

```powershell
# 50 users trong 30 giây
k6 run --vus 50 --duration 30s load-test.js

# 100 users trong 2 phút
k6 run --vus 100 --duration 2m load-test.js
```

---

### **3. Xuất kết quả ra file**

```powershell
# JSON
k6 run --out json=results.json load-test.js

# CSV
k6 run --out csv=results.csv load-test.js

# HTML report (cần k6-reporter)
k6 run --out json=results.json load-test.js
# Sau đó dùng tool khác để convert JSON → HTML
```

---

### **4. Chạy với nhiều stages**

Script `load-test.js` đã có sẵn stages:
```javascript
stages: [
  { duration: '30s', target: 10 },   // Tăng dần lên 10 users
  { duration: '1m', target: 50 },    // Tăng lên 50 users
  { duration: '2m', target: 100 },   // Peak: 100 users
  { duration: '1m', target: 50 },    // Giảm xuống 50
  { duration: '30s', target: 0 },    // Về 0
]
```

---

## 📝 Tùy chỉnh script

### **1. Thay đổi BASE_URL**

Mở `load-test.js`, sửa dòng:
```javascript
const BASE_URL = 'http://localhost:3000';
```

Thành:
```javascript
const BASE_URL = 'http://your-server-ip:3000';
```

---

### **2. Thêm test users**

Sửa mảng `USERS`:
```javascript
const USERS = [
  { username: 'candidate1', password: 'password123' },
  { username: 'candidate2', password: 'password123' },
  { username: 'candidate3', password: 'password123' },
  // Thêm nhiều users ở đây
];
```

---

### **3. Test thi thử (uncomment code)**

Trong `load-test.js`, tìm phần:
```javascript
// group('Take Exam', () => {
//   const EXAM_ID = 'your-test-exam-id';
//   ...
// });
```

Bỏ comment và thay `your-test-exam-id` bằng ID đề thi thật:
```javascript
group('Take Exam', () => {
  const EXAM_ID = 'clxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // ID thật
  // ...
});
```

---

## 📊 Đọc kết quả

### **Metrics quan trọng:**

| Metric | Ý nghĩa | Mục tiêu |
|--------|---------|----------|
| **checks** | % requests thành công | > 95% |
| **http_req_duration (avg)** | Thời gian phản hồi trung bình | < 500ms |
| **http_req_duration (p95)** | 95% requests < X | < 2000ms |
| **http_req_duration (p99)** | 99% requests < X | < 5000ms |
| **http_reqs** | Tổng số requests | - |
| **http_reqs (rate)** | Requests/giây | - |
| **errors** | Tỷ lệ lỗi | < 5% |

### **Ví dụ output:**

```
✓ checks.........................: 98.50% ✓ 4925  ✗ 75
✓ http_req_duration..............: avg=245ms min=50ms med=180ms max=3.2s p(90)=450ms p(95)=1.2s
✓ http_reqs......................: 5000 (83.3/s)
✓ errors.........................: 1.50%
✓ login_duration.................: avg=180ms p(95)=800ms
✓ exam_load_duration.............: avg=320ms p(95)=1.5s
```

**Phân tích:**
- ✅ 98.5% requests thành công (tốt)
- ✅ Thời gian phản hồi trung bình 245ms (tốt)
- ⚠️ p(95) = 1.2s (chấp nhận được, nhưng có thể tối ưu)
- ⚠️ 1.5% lỗi (chấp nhận được, nhưng nên kiểm tra)

---

## 🎯 Kịch bản test

### **1. Smoke Test (Kiểm tra nhanh)**
```powershell
k6 run --vus 1 --duration 10s load-test.js
```
Mục đích: Kiểm tra script có chạy được không

---

### **2. Load Test (Tải bình thường)**
```powershell
k6 run --vus 50 --duration 5m load-test.js
```
Mục đích: Test với số lượng users dự kiến

---

### **3. Stress Test (Tải cao)**
```powershell
k6 run --vus 200 --duration 10m load-test.js
```
Mục đích: Tìm giới hạn của hệ thống

---

### **4. Spike Test (Tăng đột ngột)**
Sửa `options.stages`:
```javascript
stages: [
  { duration: '10s', target: 10 },
  { duration: '10s', target: 200 },  // Tăng đột ngột
  { duration: '3m', target: 200 },
  { duration: '10s', target: 10 },
]
```

---

### **5. Soak Test (Chạy lâu dài)**
```powershell
k6 run --vus 50 --duration 1h load-test.js
```
Mục đích: Kiểm tra memory leak, stability

---

## 🔍 Troubleshooting

### **Lỗi: "k6: command not found"**
→ Chưa cài k6 hoặc chưa thêm vào PATH

**Giải pháp:**
```powershell
choco install k6
# Hoặc restart terminal sau khi cài
```

---

### **Lỗi: "connection refused"**
→ Server chưa chạy hoặc BASE_URL sai

**Giải pháp:**
1. Kiểm tra server đang chạy: `http://localhost:3000`
2. Sửa `BASE_URL` trong `load-test.js`

---

### **Lỗi: "login failed"**
→ Username/password sai hoặc API endpoint sai

**Giải pháp:**
1. Kiểm tra API endpoint: `/api/auth/login`
2. Kiểm tra username/password trong `USERS` array
3. Test thủ công bằng Postman/curl

---

### **Lỗi rate quá cao (> 5%)**
→ Server không chịu được tải

**Giải pháp:**
1. Giảm số users: `--vus 20`
2. Tăng thời gian giữa requests: `sleep(2)`
3. Tối ưu server (database, caching, etc.)

---

## 📈 Tối ưu hiệu năng

### **Nếu p(95) > 2s:**

1. **Kiểm tra database:**
   - Thêm index
   - Optimize queries
   - Connection pooling

2. **Kiểm tra API:**
   - Caching (Redis)
   - Lazy loading
   - Pagination

3. **Kiểm tra server:**
   - CPU, RAM usage
   - Network bandwidth

---

### **Nếu error rate > 5%:**

1. **Kiểm tra logs:**
   ```powershell
   # Xem logs server
   npm run dev
   ```

2. **Kiểm tra database connections:**
   - Tăng max connections
   - Connection pooling

3. **Kiểm tra rate limiting:**
   - Tắt rate limiting khi test
   - Hoặc điều chỉnh limits

---

## 🎓 Ví dụ nâng cao

### **Test với authentication:**

```javascript
import http from 'k6/http';

export default function () {
  // 1. Login
  const loginRes = http.post('http://localhost:3000/api/auth/login', 
    JSON.stringify({ username: 'user1', password: 'pass123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  const token = loginRes.json('token');
  
  // 2. Authenticated request
  const headers = { 
    'Cookie': `token=${token}`,
    'Content-Type': 'application/json'
  };
  
  http.get('http://localhost:3000/exam', { headers });
}
```

---

### **Test với thresholds:**

```javascript
export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<2000'],  // 95% < 2s
    'http_req_failed': ['rate<0.05'],     // < 5% errors
    'checks': ['rate>0.95'],              // > 95% success
  },
};
```

Nếu không đạt threshold, k6 sẽ exit với code 1 (fail).

---

## 📚 Tài liệu tham khảo

- **Official docs:** https://k6.io/docs/
- **Examples:** https://k6.io/docs/examples/
- **Metrics:** https://k6.io/docs/using-k6/metrics/

---

## ✅ Checklist

- [ ] Cài đặt k6
- [ ] Sửa `BASE_URL` trong `load-test.js`
- [ ] Thêm test users vào `USERS` array
- [ ] Chạy smoke test: `k6 run --vus 1 --duration 10s load-test.js`
- [ ] Chạy load test: `k6 run load-test.js`
- [ ] Phân tích kết quả
- [ ] Tối ưu nếu cần

---

## 🎉 Kết luận

**k6** là công cụ tuyệt vời để kiểm tra độ chịu tải của web. Với script đã chuẩn bị sẵn, bạn chỉ cần:

1. Cài k6: `choco install k6`
2. Chạy: `k6 run load-test.js`
3. Xem kết quả và tối ưu!

Chúc bạn test thành công! 🚀
