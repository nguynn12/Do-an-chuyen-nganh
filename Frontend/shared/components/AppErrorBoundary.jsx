import React from 'react';

export default class AppErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(!this.state.failed)return this.props.children;
  return <main style={{minHeight:'70vh',display:'grid',placeItems:'center',padding:24,background:'#f8fafc'}}><section role="alert" style={{maxWidth:520,padding:30,border:'1px solid #e2e8f0',borderRadius:14,background:'#fff',color:'#334155',fontFamily:'system-ui',lineHeight:1.7}}><h1 style={{fontSize:21,color:'#183153'}}>Không hiển thị được màn hình này</h1><p>Giao diện gặp sự cố. Bạn có thể thử hiển thị lại hoặc quay về trang tổng quan.</p><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button type="button" onClick={()=>this.setState({failed:false})} style={{padding:'10px 16px',borderRadius:8,border:0,background:'#2563eb',color:'#fff',cursor:'pointer'}}>Thử hiển thị lại</button><a href="/" style={{padding:'10px 16px',color:'#334155'}}>Về tổng quan</a></div></section></main>;
 }
}
