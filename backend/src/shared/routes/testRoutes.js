import express from 'express';
const router=express.Router();
// Public health only; diagnostic user/database exports are retired.
router.get('/',(req,res)=>res.json({success:true,message:'Backend đang hoạt động!'}));
router.use((req,res)=>res.status(404).json({success:false,message:'Không tìm thấy API.'}));
export default router;
