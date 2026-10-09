# TODO — Power BI: Dữ liệu tổng hợp (phần của mình)

> Mục tiêu: bổ sung các chỉ số **Moodle không có sẵn**, phải kết hợp nhiều bảng + tự đặt luật mới tính ra được.
> Phản hồi của cô: không làm thống kê lại field có sẵn; ưu tiên dữ liệu tổng hợp, sáng tạo.
> Tổng cộng **10 mục**: Giảng viên 6, Sinh viên 4.

---

## 0. Việc phải làm TRƯỚC KHI bắt đầu

- [ ] **Làm trên bản copy** của file `.pbix` (ví dụ `LMS_phan_cua_minh.pbix`). Mỗi mục = 1 trang mới. Xong mục nào thì copy trang đó sang file chính, tránh hai người sửa chung bị đè.
- [ ] **Hỏi bạn bạn tên bảng/cột thật** của: điểm danh, quiz (câu hỏi, lần làm), bài tập (`Due_Date`, `Submit_Date`), điểm tổng kết. Dùng chung bảng, **không tự tạo bảng riêng**. Các DAX bên dưới dùng tên giả định, phải sửa lại cho khớp.
- [ ] **Hỏi bạn bạn cách nó chọn "sinh viên đang đăng nhập" ở Leaderboard** (để ẩn danh người khác mà vẫn thấy được cả lớp). Phần Sinh viên của mình phải dùng đúng cách đó.
  - Lý do: nếu đặt Page Filter lên `Dim_User` thì các sinh viên khác bị lọc mất luôn, scatter/histogram so sánh với cả lớp sẽ chỉ còn 1 điểm. Cần một bảng "sinh viên hiện tại" **không có quan hệ** với `Dim_User`, rồi so sánh bằng measure.
- [ ] Import theme màu DLU (`dlu_theme.json`, màu chủ đạo `#37883e`) cho trang mới để đồng bộ.
- [ ] Dữ liệu là dữ liệu quá khứ, nên **không dùng `TODAY()`**. Dùng ngày lớn nhất trong dữ liệu làm "hôm nay".

### Measure dùng chung (tạo 1 lần, các mục sau xài lại)

```DAX
-- Ngày "hiện tại" của bộ dữ liệu
Data Today = CALCULATE(MAX(Dim_Date[Full_Date]), ALL(Dim_Date))

-- Điểm trung bình (sửa tên cột cho khớp)
Avg Grade = AVERAGE(Fact_Course_Grade[Grade_Percentage]) / 10

-- Tỷ lệ nộp đúng hạn
On Time Rate =
DIVIDE(
    CALCULATE(COUNTROWS(Fact_Assignment_Submission), Fact_Assignment_Submission[Is_Submitted_On_Time] = 1),
    COUNTROWS(Fact_Assignment_Submission)
)

-- Tỷ lệ chuyên cần (dùng measure của bạn bạn nếu đã có)
Attendance Rate = [Attendance Rate]  -- thay bằng measure thật

-- Điểm tham gia tổng hợp (0-100). Trọng số là ĐỀ XUẤT KHỞI ĐẦU, nhóm tự chốt
Participation Score =
100 * (
    0.4 * [Attendance Rate] +
    0.3 * [On Time Rate] +
    0.3 * [Engagement Norm]      -- giờ học chuẩn hóa 0-1, xem ghi chú dưới
)
```

Ghi chú `Engagement Norm`: giờ học của sinh viên chia cho giờ học cao nhất trong lớp, giới hạn tối đa 1.

---

## PHẦN A — GIẢNG VIÊN (6 mục, gộp thành 4 trang)

| Trang | Gồm mục |
|---|---|
| Trang "Hành vi nộp bài" | Mục 3 |
| Trang "Phân khúc & Cảnh báo" | Mục 1, Mục 2 |
| Trang "Tương quan & Phễu tham gia" | Mục 7, Mục 8 |
| Trang "Cảnh báo sớm – Đánh giá độ chính xác" | Mục 6 |

### GV-3. Nước rút / trì hoãn (làm đầu tiên)

**Vì sao Moodle thiếu:** Moodle chỉ lưu giờ nộp. Hai sinh viên cùng "đúng hạn" nhưng một người nộp sớm 5 ngày, một người nộp trước hạn 2 giờ, hành vi hoàn toàn khác.

**Việc cần làm:**
- [ ] Thêm cột tính toán vào bảng bài nộp:
```DAX
Lead Hours =
IF(
    NOT ISBLANK(Fact_Assignment_Submission[Submit_Date]),
    DATEDIFF(Fact_Assignment_Submission[Submit_Date], Fact_Assignment_Submission[Due_Date], HOUR)
)

Lead Bucket =
SWITCH(TRUE(),
    ISBLANK([Lead Hours]), "Chưa nộp",
    [Lead Hours] < 0,      "Trễ hạn",
    [Lead Hours] < 24,     "Dưới 24 giờ",
    [Lead Hours] < 72,     "1-3 ngày",
    "Sớm hơn 3 ngày"
)
```
- [ ] Measure gắn nhãn từng sinh viên:
```DAX
Avg Lead Days = AVERAGE(Fact_Assignment_Submission[Lead Hours]) / 24

Submit Style =
SWITCH(TRUE(),
    ISBLANK([Avg Lead Days]), "Chưa có dữ liệu",
    [Avg Lead Days] < 0,  "Hay trễ hạn",
    [Avg Lead Days] < 1,  "Nước rút phút chót",
    [Avg Lead Days] < 3,  "Làm đều",
    "Làm sớm"
)
```
- [ ] Visual: **Histogram** (cột) đếm số bài theo `Lead Bucket` (sắp xếp thứ tự bucket đúng chiều thời gian), **bảng** sinh viên + `Submit Style` + `Avg Lead Days` (tô màu theo nhãn).
- [ ] Thêm slicer chọn môn và slicer chọn bài tập.

**Kiểm tra:** chọn 1 sinh viên, đối chiếu tay `Lead Hours` với bảng gốc. Nếu dữ liệu giả nên ngày nộp quá đều, nói rõ khi bảo vệ.

---

### GV-1. Phân khúc sinh viên 2×2

**Việc cần làm:**
- [ ] Tạo ngưỡng theo **trung vị của lớp** (tự thích ứng theo môn):
```DAX
P Threshold = MEDIANX(ALLSELECTED(Dim_User), [Participation Score])
G Threshold = MEDIANX(ALLSELECTED(Dim_User), [Avg Grade])
```
- [ ] Measure phân nhóm:
```DAX
Segment =
VAR P = [Participation Score]
VAR G = [Avg Grade]
RETURN SWITCH(TRUE(),
    P >= [P Threshold] && G >= [G Threshold], "Chăm & giỏi",
    P >= [P Threshold],                       "Chăm nhưng điểm thấp",
    G >= [G Threshold],                       "Ít tham gia nhưng điểm cao",
    "Nguy cơ cao")

Segment Color =
SWITCH([Segment],
    "Chăm & giỏi", "#37883E",
    "Chăm nhưng điểm thấp", "#E0A030",
    "Ít tham gia nhưng điểm cao", "#4A90B8",
    "Nguy cơ cao", "#C0504D",
    "#999999")
```
- [ ] Visual **Scatter chart**: Details = tên sinh viên, X = `Participation Score`, Y = `Avg Grade`.
  - **Lưu ý:** measure **không dùng được làm Legend**. Tô màu bằng: Format → Data colors → fx → Format style = *Field value* → chọn `Segment Color`.
  - Đường chia góc phần tư: Analytics pane → Constant line (X và Y), bấm **fx** chọn `P Threshold` / `G Threshold`.
- [ ] Bảng đếm số sinh viên mỗi nhóm bên cạnh scatter.
- [ ] Cấu hình **Drill through** sang trang Student 360 của bạn bạn (click điểm → xem hồ sơ).

**Kiểm tra:** tổng số sinh viên 4 nhóm = tổng sinh viên lớp. Đổi môn thì ngưỡng phải đổi theo.

---

### GV-2. Điểm cảnh báo sớm kèm lý do

**Vì sao Moodle thiếu:** không có gì gộp điểm danh + bài tập + quiz thành một đánh giá rủi ro, càng không giải thích được lý do.

**Việc cần làm:**
- [ ] Tạo từng **cờ** (mỗi cờ trả 1 hoặc 0). Ngưỡng là đề xuất, nhóm tự chỉnh:
```DAX
Flag Absent =        -- vắng liên tiếp / vắng nhiều buổi gần nhất (sửa theo bảng điểm danh thật)
IF([Absent In Last 3] >= 3, 1, 0)

Flag Late Submit =
IF([On Time Rate] < 0.5, 1, 0)

Flag Quiz Drop =     -- quiz gần nhất thấp hơn trung bình trước đó đáng kể
IF([Quiz Avg Recent] < [Quiz Avg Before] - 1, 1, 0)

Flag Inactive =      -- không hoạt động >= 14 ngày so với ngày cuối dữ liệu
IF(DATEDIFF([Last Activity Date], [Data Today], DAY) >= 14, 1, 0)
```
- [ ] Điểm rủi ro và chuỗi lý do:
```DAX
Risk Score =
100 * (0.35 * [Flag Absent] + 0.25 * [Flag Late Submit]
     + 0.20 * [Flag Quiz Drop] + 0.20 * [Flag Inactive])

Risk Reason =
VAR r =
    IF([Flag Absent] = 1,      "Vắng nhiều buổi gần đây; ", "") &
    IF([Flag Late Submit] = 1, "Hay nộp trễ; ", "") &
    IF([Flag Quiz Drop] = 1,   "Điểm quiz giảm; ", "") &
    IF([Flag Inactive] = 1,    "Lâu không hoạt động; ", "")
RETURN IF(r = "", "Không có dấu hiệu", r)
```
- [ ] Visual: **bảng** sinh viên + `Risk Score` + `Risk Reason`, sắp giảm dần theo điểm, tô màu theo mức (≥60 đỏ, 30-59 cam, <30 xanh). Thêm **histogram** phân bố `Risk Score` cả lớp.
- [ ] Chốt công thức và trọng số trong nhóm, **ghi lại lý do chọn** để trả lời hội đồng.

**Kiểm tra:** chọn 1 sinh viên có điểm cao, tự kiểm từng cờ có đúng không.

---

### GV-8. Phễu tham gia

**Việc cần làm:**
- [ ] Tạo bảng rời `Funnel_Stage` (cột `Stage`, `Order`) nhập tay các tầng:
  1 Ghi danh → 2 Có truy cập → 3 Điểm danh ≥ 1 buổi → 4 Nộp ≥ 1 bài → 5 Làm ≥ 1 quiz → 6 Có điểm tổng kết.
- [ ] Measure:
```DAX
Funnel Count =
SWITCH(SELECTEDVALUE(Funnel_Stage[Order]),
    1, DISTINCTCOUNT(Fact_Enrolment[User_Key]),
    2, DISTINCTCOUNT(Fact_Daily_Engagement[User_Key]),
    3, [Students With Attendance],   -- đếm distinct sinh viên có >= 1 dòng điểm danh có mặt
    4, [Students With Submission],
    5, [Students With Quiz],
    6, [Students With Final Grade])
```
  (Ghi chú: các measure `Students With ...` tự định nghĩa bằng `DISTINCTCOUNT` trên bảng fact tương ứng.)
- [ ] Visual: **Funnel chart** (Group = `Funnel_Stage[Stage]`, Values = `Funnel Count`), hiện kèm % so với tầng đầu.
- [ ] Ghi chú nhỏ bên cạnh: tầng nào rớt mạnh nhất (tính bằng measure so sánh tầng liền kề).

**Kiểm tra:** số ở tầng sau không được lớn hơn tầng trước (nếu lớn hơn là sai quan hệ bảng hoặc sai định nghĩa).

---

### GV-7. Ma trận tương quan

**Việc cần làm (chọn 1 trong 2 cách):**

**Cách A — Tính bằng DAX (tự chứa, nhưng dài):**
```DAX
Pearson =
VAR T =
    ADDCOLUMNS(
        VALUES(Dim_User[User_Key]),
        "x", [Factor Value],      -- yếu tố đang xét
        "y", [Avg Grade]
    )
VAR Tf = FILTER(T, NOT ISBLANK([x]) && NOT ISBLANK([y]))
VAR mx = AVERAGEX(Tf, [x])
VAR my = AVERAGEX(Tf, [y])
VAR num = SUMX(Tf, ([x] - mx) * ([y] - my))
VAR den = SQRT(SUMX(Tf, ([x] - mx) ^ 2) * SUMX(Tf, ([y] - my) ^ 2))
RETURN DIVIDE(num, den)
```
`Factor Value` = `SWITCH` theo bảng rời `Factor` (Chuyên cần, Nộp đúng hạn, Giờ học, Điểm quiz, Điểm bài tập).

**Cách B — Tính ngoài rồi nạp bảng (nhanh, ít lỗi):** viết script Python/SQL tính Pearson theo từng môn, ghi vào bảng `Correlation_Result(Course_Key, Factor, R, N)`, Power BI chỉ hiển thị.

- [ ] Visual: **Matrix** hàng = yếu tố, cột = môn (hoặc 1 cột cho môn đang chọn), giá trị = `R`, tô màu theo thang (đỏ âm → trắng → xanh dương).
- [ ] Thêm cột `N` (số sinh viên). N nhỏ (< 15) thì đánh dấu "ít dữ liệu".
- [ ] Thêm 1 scatter + Trendline cho cặp có |R| cao nhất để minh họa.
- [ ] Chú thích trên trang: **tương quan không phải nhân quả**.

**Kiểm tra:** so với Trendline/R trên scatter, hoặc tính thử bằng Excel `CORREL` cho 1 cặp.

---

### GV-6. Cảnh báo sớm từ N tuần đầu (làm cuối, khó nhất)

**Ý tưởng:** nếu chỉ dùng dữ liệu đến cuối tuần N, rồi dùng `Risk Score` (mục GV-2) để đoán ai sẽ rớt, thì so với kết quả thật đúng bao nhiêu %?

**Việc cần làm:**
- [ ] Tính **ngoài Power BI** (Python/SQL) cho gọn: với mỗi (sinh viên, môn, mốc tuần N ∈ {2,3,4,6,8}), chỉ lấy dữ liệu tới hết tuần N, tính `Risk Score`, gắn `Predicted_At_Risk` (vd ≥ 40). Ghi vào bảng `Early_Warning_Eval(Course_Key, User_Key, Week_N, Risk_Score, Predicted_At_Risk, Actual_Failed)`.
- [ ] `Actual_Failed` lấy từ kết quả cuối kỳ thật (dưới ngưỡng đạt của môn).
- [ ] Measure:
```DAX
TP = CALCULATE(COUNTROWS(Early_Warning_Eval), Early_Warning_Eval[Predicted_At_Risk] = 1, Early_Warning_Eval[Actual_Failed] = 1)
FP = CALCULATE(COUNTROWS(Early_Warning_Eval), Early_Warning_Eval[Predicted_At_Risk] = 1, Early_Warning_Eval[Actual_Failed] = 0)
FN = CALCULATE(COUNTROWS(Early_Warning_Eval), Early_Warning_Eval[Predicted_At_Risk] = 0, Early_Warning_Eval[Actual_Failed] = 1)
TN = CALCULATE(COUNTROWS(Early_Warning_Eval), Early_Warning_Eval[Predicted_At_Risk] = 0, Early_Warning_Eval[Actual_Failed] = 0)

Recall    = DIVIDE([TP], [TP] + [FN])   -- bắt được bao nhiêu % người thật sự rớt
Precision = DIVIDE([TP], [TP] + [FP])   -- trong số bị cảnh báo, bao nhiêu % thật sự rớt
Accuracy  = DIVIDE([TP] + [TN], [TP] + [TN] + [FP] + [FN])
```
- [ ] Visual: **Line chart** Recall/Precision theo `Week_N` (thấy "tuần mấy thì cảnh báo đủ tin cậy"), kèm **Matrix** nhầm lẫn (TP/FP/FN/TN) cho mốc đang chọn.
- [ ] Dùng chữ **"Cảnh báo sớm"**, không dùng "AI dự đoán". Ghi rõ độ chính xác thật.

**Lưu ý quan trọng:** nếu ít sinh viên rớt, `Accuracy` sẽ cao một cách vô nghĩa (đoán "không ai rớt" cũng đúng 90%). Vì vậy **báo cáo Recall và Precision là chính**, Accuracy chỉ phụ. Nếu dữ liệu là dữ liệu giả/synthetic, nói thẳng khi bảo vệ.

---

## PHẦN B — SINH VIÊN (4 mục, gộp 1 trang "Hồ sơ hành vi của tôi")

> **Tránh trùng** với phần bạn bạn đã làm: Grade Prediction, Effort Meter, GPA 4.0, Leaderboard, Donut nộp bài, Heatmap tương tác, so sánh lab. Không làm lại các thứ này.
> Quy tắc ẩn danh: người khác chỉ là chấm xám/số liệu gộp, **không hiện tên hoặc mã** ai khác.

### SV-1. "Tôi đang ở góc nào"
- [ ] Dùng lại `Participation Score`, `Avg Grade`, `P Threshold`, `G Threshold` ở mục GV-1.
- [ ] Scatter cả lớp: mọi sinh viên là chấm xám nhỏ (ẩn tooltip tên), **chấm của mình tô màu** và to hơn bằng measure `Is Me`:
```DAX
Is Me = IF(SELECTEDVALUE(Dim_User[User_Key]) = SELECTEDVALUE(Current_Student[User_Key]), 1, 0)
```
- [ ] Hiển thị nhãn nhóm của mình bằng giọng trung tính ("Bạn đang ở nhóm: Chăm nhưng điểm chưa cao"), kèm 1 dòng gợi ý.

### SV-2. "Điều cần chú ý"
- [ ] Dùng lại các cờ ở GV-2 nhưng chỉ cho **sinh viên hiện tại**, hiển thị tối đa 2-3 tín hiệu.
- [ ] Đổi sang giọng nhẹ nhàng: "Bạn đã vắng 2 buổi liên tiếp", "Điểm quiz gần đây thấp hơn các bài trước". **Không** hiện chữ "nguy cơ", **không** hiện `Risk Score`.
- [ ] Nếu không có cờ nào: hiện "Bạn đang đi đúng hướng" (màu xanh).

### SV-3. Hồ sơ nộp bài của tôi
- [ ] Dùng lại `Lead Bucket`, `Avg Lead Days`, `Submit Style` ở mục GV-3.
- [ ] Biểu đồ cột nhóm: tỷ lệ bài của tôi theo từng bucket **so với trung bình lớp** (nhóm cột 2 màu).
- [ ] Hiển thị nhãn `Submit Style` của mình (vd "Nước rút phút chót") kèm gợi ý ngắn.

### SV-7. Yếu tố nào liên quan nhiều nhất tới điểm ở lớp này
- [ ] Dùng bảng/measure tương quan ở mục GV-7 (số liệu **cả lớp**, không lộ cá nhân).
- [ ] Bar chart ngang xếp hạng `|R|` các yếu tố, kèm 1 câu: "Ở môn này, chuyên cần liên quan mạnh nhất tới điểm cuối kỳ".
- [ ] Giữ lời lẽ trung lập, không khẳng định nhân quả.

**Ghi chú:** SV-8 (phễu "tiến độ của tôi") **không làm** (chốt 10 mục).

---

## Thứ tự thực hiện

1. **0. Chuẩn bị** (hỏi tên bảng, cách chọn sinh viên hiện tại, tạo measure dùng chung)
2. **GV-3** → làm xong thì có luôn **SV-3**
3. **GV-1** → có luôn **SV-1**
4. **GV-2** → có luôn **SV-2**
5. **GV-8**
6. **GV-7** → có luôn **SV-7**
7. **GV-6** (cuối cùng)

## Checklist hoàn thành

- [ ] GV-3  - [ ] GV-1  - [ ] GV-2  - [ ] GV-8  - [ ] GV-7  - [ ] GV-6
- [ ] SV-3  - [ ] SV-1  - [ ] SV-2  - [ ] SV-7
- [ ] Đã áp theme DLU, đổi hết label tiếng Anh sang tiếng Việt
- [ ] Đã chép các trang sang file chính và test lại slicer

---

## Câu hội đồng có thể hỏi (chuẩn bị sẵn)

- **Trọng số Risk Score/Participation Score lấy đâu ra?** → Nhóm tự đặt dựa trên mức độ ảnh hưởng, có thể chỉnh; trình bày kết quả thử với vài bộ trọng số.
- **Sao ngưỡng 2×2 là trung vị?** → Để tự thích ứng theo từng môn, không phụ thuộc điểm tuyệt đối.
- **Cảnh báo sớm có chính xác không?** → Trả lời bằng Recall/Precision thật theo từng tuần, nói rõ hạn chế (dữ liệu ít, mất cân bằng lớp).
- **Tương quan có phải nhân quả không?** → Không, chỉ là mối liên hệ thống kê; ghi chú trên trang.
- **Sao sinh viên không thấy người khác?** → Tôn trọng riêng tư: chỉ hiện dữ liệu gộp và chấm ẩn danh.
- **Dùng Power BI thay vì web?** → Power BI mạnh ở tổng hợp/phân tích (DAX, conditional formatting, funnel, scatter); web đảm nhiệm đăng nhập và điều hướng.
- **Tích hợp web ra sao?** → Publish to Web không có phân quyền thật; nêu rõ giải pháp đầy đủ là embed có xác thực (RLS) nhưng ngoài phạm vi đồ án, demo bằng bộ lọc mô phỏng.
