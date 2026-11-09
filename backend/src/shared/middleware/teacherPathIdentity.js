// Use only after requireTeacherAuth has checked the JWT and live account.
export function requireOwnTeacherPath(req,res,next) {
 if(!req.teacher?.moodleUserId) return res.status(401).json({success:false,message:'Vui lòng đăng nhập bằng tài khoản giảng viên.'});
 const id=Number(req.params.teacherId);
 if(!Number.isSafeInteger(id) || id<=0) return res.status(400).json({success:false,message:'Mã giảng viên không hợp lệ.'});
 if(id!==Number(req.teacher.moodleUserId)) return res.status(403).json({success:false,message:'Bạn không có quyền thao tác dữ liệu của giảng viên khác.'});
 return next();
}
