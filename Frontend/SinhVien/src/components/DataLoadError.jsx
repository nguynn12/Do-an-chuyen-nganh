import React from 'react';
export default function DataLoadError({message,onRetry}){
 return <main className="page-full"><section role="alert" style={{padding:26,border:'1px solid #fecaca',borderRadius:12,background:'#fff',margin:'20px 0',color:'#334155'}}><h2 style={{fontSize:19}}>Chưa tải được dữ liệu</h2><p>{message || 'Kết nối tới hệ thống gặp sự cố. Vui lòng thử lại.'}</p><button type="button" onClick={onRetry} style={{padding:'10px 16px',border:0,borderRadius:8,background:'#2563eb',color:'#fff',cursor:'pointer'}}>Thử lại</button></section></main>;
}
