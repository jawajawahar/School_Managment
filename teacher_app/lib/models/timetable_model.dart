class TimetableSlotModel {
  final String id;
  final String classId;
  final String subjectId;
  final String teacherId;
  final int dayOfWeek; // 1 = Mon, 5 = Fri
  final int periodNo;
  final String startTime;
  final String endTime;
  final String room;
  final String? subjectName;
  final String? className;
  final String? teacherName;

  TimetableSlotModel({
    required this.id,
    required this.classId,
    required this.subjectId,
    required this.teacherId,
    required this.dayOfWeek,
    required this.periodNo,
    required this.startTime,
    required this.endTime,
    required this.room,
    this.subjectName,
    this.className,
    this.teacherName,
  });

  String get subjectLabel => (subjectName != null && subjectName!.isNotEmpty) ? subjectName! : subjectId;
  String get classLabel => (className != null && className!.isNotEmpty) ? className! : classId;

  factory TimetableSlotModel.fromJson(Map<String, dynamic> json) {
    return TimetableSlotModel(
      id: json['id'] ?? '',
      classId: json['classId'] ?? json['class_id'] ?? '',
      subjectId: json['subjectId'] ?? json['subject_id'] ?? '',
      teacherId: json['teacherId'] ?? json['teacher_id'] ?? '',
      dayOfWeek: json['dayOfWeek'] ?? json['day_of_week'] ?? 1,
      periodNo: json['periodNo'] ?? json['period_no'] ?? 1,
      startTime: json['startTime'] ?? json['start_time'] ?? '',
      endTime: json['endTime'] ?? json['end_time'] ?? '',
      room: json['room'] ?? '',
      subjectName: json['subjectName'],
      className: json['className'],
      teacherName: json['teacherName'],
    );
  }
}
