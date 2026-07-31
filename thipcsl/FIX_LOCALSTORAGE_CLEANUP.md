# Fix: Xóa LocalStorage Cũ Khi Thi Lại

## 🐛 Vấn đề

**Scenario:**
1. Thí sinh làm bài thi (trả lời 5 câu, vi phạm 2 lần)
2. Admin xóa Result để cho thi lại
3. Thí sinh F5 hoặc vào lại bài thi
4. **BUG:** Bài thi mới vẫn load câu trả lời cũ, thời gian cũ, vi phạm cũ từ localStorage!

**Nguyên nhân:**
- Khi admin xóa Result trong database ✅
- LocalStorage trên client vẫn còn:
  - `exam_${id}_answers` - Câu trả lời cũ
  - `exam_${id}_endTime` - Thời gian cũ
  - `exam_${id}_violations` - Số lần vi phạm cũ
  - `exam_${id}_sessionToken` - Session token cũ

**Code cũ (dòng 72-96):**
```typescript
} else {
    // Fallback to local storage or new start
    const savedEndTime = localStorage.getItem(`exam_${id}_endTime`);
    if (savedEndTime) {
        endTime = parseInt(savedEndTime);  // ← Load thời gian cũ!
    }
}

// Load Saved Answers
const savedAnswers = localStorage.getItem(`exam_${id}_answers`);
if (savedAnswers) {
    setAnswers(JSON.parse(savedAnswers));  // ← Load câu trả lời cũ!
}

// Load Violation Count
const savedViolations = localStorage.getItem(`exam_${id}_violations`);
if (savedViolations) {
    setViolationCount(parseInt(savedViolations));  // ← Load vi phạm cũ!
}
```

---

## ✅ Giải pháp

### Logic mới

**Phân biệt 2 trường hợp:**

1. **Bài thi đang làm dở** (`data.startedAt` có giá trị)
   - Load từ server trước
   - Fallback localStorage nếu server không có
   - Giữ nguyên tất cả dữ liệu

2. **Bài thi mới** (`data.startedAt` = undefined)
   - **XÓA localStorage cũ**
   - Reset tất cả state về mặc định
   - Tạo endTime mới

### Code mới (dòng 62-115)

```typescript
// Initialize or Load Timer
let endTime = 0;
if (data.startedAt) {
    // Server source of truth - Bài thi đang làm dở
    const startTime = new Date(data.startedAt).getTime();
    const durationMs = data.exam.duration * 60 * 1000;
    endTime = startTime + durationMs;
    localStorage.setItem(`exam_${id}_endTime`, endTime.toString());
} else {
    // Bài thi mới - Xóa localStorage cũ để tránh load dữ liệu cũ
    console.log('[INFO] New exam session - Clearing old localStorage data');
    localStorage.removeItem(`exam_${id}_endTime`);
    localStorage.removeItem(`exam_${id}_answers`);
    localStorage.removeItem(`exam_${id}_violations`);
    // Giữ sessionToken để server có thể track
    
    // Tạo endTime mới
    const durationSec = data.exam.duration * 60;
    endTime = Date.now() + durationSec * 1000;
    localStorage.setItem(`exam_${id}_endTime`, endTime.toString());
}

const remaining = Math.floor((endTime - Date.now()) / 1000);
setTimeLeft(remaining > 0 ? remaining : 0);

// Load Saved Answers (Server First, then Local)
if (data.answers && Object.keys(data.answers).length > 0) {
    setAnswers(data.answers);
    localStorage.setItem(`exam_${id}_answers`, JSON.stringify(data.answers));
} else {
    // Chỉ load từ localStorage nếu có startedAt (bài thi đang làm dở)
    if (data.startedAt) {
        const savedAnswers = localStorage.getItem(`exam_${id}_answers`);
        if (savedAnswers) {
            setAnswers(JSON.parse(savedAnswers));
        }
    } else {
        // Bài thi mới - Reset answers
        setAnswers({});
    }
}

// Load Violation Count (chỉ nếu có startedAt)
if (data.startedAt) {
    const savedViolations = localStorage.getItem(`exam_${id}_violations`);
    if (savedViolations) {
        setViolationCount(parseInt(savedViolations));
    }
} else {
    // Bài thi mới - Reset violation count
    setViolationCount(0);
}
```

---

## 🎯 Kịch bản được fix

### Kịch bản 1: Bài thi đang làm dở (F5 giữa chừng)
- Server trả về `startedAt` ✅
- Load answers, endTime, violations từ server/localStorage ✅
- Tiếp tục làm bài bình thường ✅

### Kịch bản 2: Admin xóa Result, cho thi lại
- Server **KHÔNG** trả về `startedAt` ✅
- **XÓA** localStorage cũ ✅
- Reset answers = `{}` ✅
- Reset violationCount = `0` ✅
- Tạo endTime mới = `now + duration` ✅
- Bài thi hoàn toàn mới! ✅

### Kịch bản 3: Thi lần đầu tiên
- Server **KHÔNG** trả về `startedAt` ✅
- Không có localStorage cũ ✅
- Tạo bài thi mới bình thường ✅

---

## 🧪 Test

Chạy test script:
```bash
npx tsx test-delete-result-retake.ts
```

**Kết quả:**
```
✅ CORRECT: No startedAt → Clear localStorage
   → Remove: exam_${id}_endTime
   → Remove: exam_${id}_answers
   → Remove: exam_${id}_violations
   → Keep: exam_${id}_sessionToken (for tracking)
   → Reset: answers = {}
   → Reset: violationCount = 0
   → Create: New endTime = now + duration

✅ Result: Bài thi mới hoàn toàn, không load dữ liệu cũ!
```

---

## 📋 Checklist

- ✅ Xóa localStorage cũ khi bài thi mới
- ✅ Giữ localStorage khi bài thi đang làm dở
- ✅ Reset answers về `{}`
- ✅ Reset violationCount về `0`
- ✅ Tạo endTime mới
- ✅ Giữ sessionToken để tracking
- ✅ Không ảnh hưởng bài thi đang làm dở
- ✅ Test script verify logic

---

## ⚠️ Lưu ý

### Giữ sessionToken
- **KHÔNG** xóa `sessionToken` khỏi localStorage
- Lý do: Server cần track session để phát hiện takeover
- sessionToken sẽ được update khi tạo bài thi mới

### Phân biệt startedAt
- `data.startedAt` có giá trị → Bài thi đang làm dở
- `data.startedAt` = undefined → Bài thi mới
- Đây là **source of truth** để quyết định xóa localStorage

---

## 🔄 Luồng hoạt động mới

```
Client GET /api/exam-runner/[id]
    ↓
Server trả về data
    ↓
data.startedAt có giá trị?
    ├─ YES (Bài thi đang làm dở)
    │   ├─ Load endTime từ server
    │   ├─ Load answers từ server/localStorage
    │   ├─ Load violations từ localStorage
    │   └─ Tiếp tục làm bài
    │
    └─ NO (Bài thi mới)
        ├─ XÓA localStorage cũ:
        │   ├─ exam_${id}_endTime
        │   ├─ exam_${id}_answers
        │   └─ exam_${id}_violations
        ├─ Reset state:
        │   ├─ answers = {}
        │   ├─ violationCount = 0
        │   └─ endTime = now + duration
        └─ Bắt đầu bài thi mới
```

---

## 📊 So sánh

| Trường hợp | Trước (BUG) | Sau (FIXED) |
|------------|-------------|-------------|
| **Admin xóa Result** | Load câu trả lời cũ | Reset về rỗng ✅ |
| **Thời gian** | Load thời gian cũ | Tạo thời gian mới ✅ |
| **Vi phạm** | Load vi phạm cũ | Reset về 0 ✅ |
| **Bài thi đang làm dở** | Hoạt động bình thường | Hoạt động bình thường ✅ |

---

## 📄 Files đã sửa

1. ✅ `app/exam/[id]/page.tsx` - Logic xóa localStorage cũ
2. ✅ `test-delete-result-retake.ts` - Test script
3. ✅ `FIX_LOCALSTORAGE_CLEANUP.md` - Tài liệu này
