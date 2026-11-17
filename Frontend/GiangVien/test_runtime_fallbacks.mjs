import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transformWithOxc} from 'vite';
async function load(file,name){const source=fs.readFileSync(file,'utf8').replace(/import React from 'react';/,'').replace('export default ','');const out=await transformWithOxc(source,file,{jsx:{runtime:'classic',development:false}});return vm.runInNewContext(out.code+`;${name}`,{React});}
const Boundary=await load('../shared/components/AppErrorBoundary.jsx','AppErrorBoundary');
const boundary=new Boundary({children:React.createElement('p',null,'Working screen')});
assert.ok(renderToStaticMarkup(boundary.render()).includes('Working screen'));
boundary.state=Boundary.getDerivedStateFromError(new Error('synthetic render error'));
const fallback=renderToStaticMarkup(boundary.render());assert.ok(fallback.includes('role="alert"'));assert.ok(fallback.includes('Thử hiển thị lại'));assert.ok(fallback.includes('href="/"'));assert.ok(!fallback.includes('synthetic render error'));
const DataError=await load('../SinhVien/src/components/DataLoadError.jsx','DataLoadError');
const errorMarkup=renderToStaticMarkup(React.createElement(DataError,{message:'Không tải được dữ liệu',onRetry:()=>{}}));assert.ok(errorMarkup.includes('role="alert"'));assert.ok(errorMarkup.includes('Thử lại'));
console.log('PASS: normal content; error recovery actions without raw exception; student load errors show retry. Static component rendering, not browser E2E.');
