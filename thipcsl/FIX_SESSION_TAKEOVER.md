# Fix: Session Takeover Detection

## 🐛 Vấn đề

**Test Case:**
1. Máy A vào thi bài số 1 → Tạo `Result` với `status: IN_PROGRESS`, `session_token: tokenA`
2. Máy A vi phạm → `is_locked: true` (nhưng `status` vẫn là `IN_PROGRESS`)
3. Máy B vào thi bài 1 → Tìm thấy `Result IN_PROGRESS` → Tạo `session_token: tokenB` (ghi đè tokenA)
4. Máy B nộp bài → `status: COMPLETED`, `session_token: tokenB`
5. **Máy A F5** → ❌ BUG: Tạo bài thi mới thay vì bị reject!

**Nguyên nhân:**
- Khi máy B nộp bài, `Result` chuyển sang `COMPLETED`
- Máy A F5 → Không tìm thấy `IN_PROGRESS` result
- Code cũ chỉ kiểm tra `max_attempts` → Cho phép tạo bài mới

---

## ✅ Giải pháp

### Thay đổi trong `app/api/exam-runner/[id]/route.ts`

**Thêm logic kiểm tra session token cũ (dòng 110-147):**

```typescript
if (!inProgressResult) {
    // [FIX] Check if client has old sessionToken from a previous attempt
    const { searchParams } = new URL(request.url);
    const providedToken = searchParams.get('sessionToken');

    if (providedToken) {
        // CASE 1: Token khớp với result COMPLETED gần đây
        const recentResult = existingResults.find(r => 
            r.session_token === providedToken && 
            r.status === 'COMPLETED' &&
            (new Date().getTime() - new Date(r.submitted_at).getTime() < 5 * 60 * 1000)
        );

        if (recentResult) {
            return NextResponse.json({
                error: 'Bài thi đã được nộp. Phiên làm việc của bạn đã kết thúc.',
                submitted: true,
                resultId: recentResult.id
            }, { status: 403 });
        }

        // CASE 2: Có result COMPLETED gần đây nhưng token khác (session takeover)
        const anyRecentCompleted = existingResults.find(r => 
            r.status === 'COMPLETED' &&
            (new Date().getTime() - new Date(r.submitted_at).getTime() < 5 * 60 * 1000)
        );

        if (anyRecentCompleted && anyRecentCompleted.session_token !== providedToken) {
            return NextResponse.json({
                error: 'Phiên làm việc của bạn đã bị gián đoạn bởi một phiên đăng nhập khác và bài thi đã được nộp.',
                submitted: true,
                resultId: anyRecentCompleted.id
            }, { status: 403 });
        }
    }

    // Tiếp tục kiểm tra max_attempts...
}
```

---

## 🎯 Kịch bản được fix

### Kịch bản 1: Máy A nộp bài, sau đó F5
- Máy A có `tokenA`
- Result COMPLETED với `session_token: tokenA`
- F5 → **CASE 1** → Reject: "Bài thi đã được nộp"

### Kịch bản 2: Máy A bị máy B takeover và nộp bài
- Máy A có `tokenA` (cũ)
- Result COMPLETED với `session_token: tokenB` (mới)
- Máy A F5 → **CASE 2** → Reject: "Phiên làm việc đã bị gián đoạn"

### Kịch bản 3: Bài thi cũ đã nộp lâu (> 5 phút)
- Result COMPLETED nhưng đã > 5 phút
- Cho phép làm bài mới (nếu chưa hết `max_attempts`)

---

## 🧪 Test

Chạy test script:
```bash
npx tsx test-session-takeover.ts
```

**Kết quả:**
```
✅ CASE 2: Session takeover detected!
   → Completed by token: token-machine-B
   → Client has token: token-machine-A
   → Message: "Phiên làm việc của bạn đã bị gián đoạn..."
   → Redirect to: /exam/results/{resultId}
```

---

## 📋 Checklist

- ✅ Ngăn tạo bài mới khi session bị takeover
- ✅ Ngăn tạo bài mới khi đã nộp bài
- ✅ Cho phép làm bài mới sau 5 phút (nếu chưa hết attempts)
- ✅ Không ảnh hưởng database schema
- ✅ Không ảnh hưởng module ôn thi (PRACTICE)
- ✅ Test script verify logic

---

## ⚠️ Lưu ý

- Thời gian "gần đây" được set là **5 phút**
- Chỉ áp dụng cho bài thi OFFICIAL (không áp dụng PRACTICE)
- Frontend vẫn giữ `sessionToken` trong localStorage để có thể xem kết quả
- Nếu muốn thay đổi thời gian, sửa `5 * 60 * 1000` (5 phút = 300000ms)

---

## 🔄 Luồng hoạt động mới

```
Client GET /api/exam-runner/[id]?sessionToken=xxx
    ↓
Tìm IN_PROGRESS result?
    ├─ YES → Trả về bài thi đang làm
    └─ NO → Kiểm tra sessionToken
        ├─ Token khớp COMPLETED gần đây?
        │   └─ YES → Reject: "Bài thi đã được nộp"
        ├─ Có COMPLETED gần đây với token khác?
        │   └─ YES → Reject: "Phiên bị gián đoạn"
        └─ Kiểm tra max_attempts
            ├─ Đã hết lượt → Reject
            └─ Còn lượt → Tạo bài mới
```
