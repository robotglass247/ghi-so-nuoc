/* R11.35 - XEM CHI SO footer-fit V19
 * Thu chieu cao vung bang de nut QUAY LAI UNG DUNG luon hien tren man hinh.
 * Khong thay doi du lieu, bo loc hoac logic TAT CA.
 */
(function(){
  'use strict';

  const BUILD='r1135-view-footer-fit-v19';
  const originalOpen=window.open.bind(window);

  function installFit(win){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      try{
        if(!win || win.closed){clearInterval(timer);return;}
        const d=win.document;
        const wrap=d.querySelector('.wrap');
        const tableWrap=d.querySelector('.tableWrap');
        const back=d.getElementById('wvBack');
        if(wrap && tableWrap && back){
          let style=d.getElementById('wvFooterFitStyle');
          if(!style){
            style=d.createElement('style');
            style.id='wvFooterFitStyle';
            d.head.appendChild(style);
          }
          style.textContent=`
            html,body{
              height:100%;
              min-height:100%;
              overflow:hidden;
            }
            body{
              height:100vh;
              height:100dvh;
            }
            .wrap{
              height:100vh;
              height:100dvh;
              min-height:0;
              box-sizing:border-box;
              display:flex;
              flex-direction:column;
              overflow:hidden;
            }
            .title,.filters,.summary,.back{
              flex:0 0 auto;
            }
            .tableWrap{
              flex:1 1 auto;
              min-height:90px;
              max-height:none!important;
              overflow:auto!important;
            }
            .back{
              flex:0 0 auto;
              margin:8px auto 0!important;
              padding:9px 16px!important;
              min-height:38px;
              box-sizing:border-box;
            }
            @media(max-width:700px){
              .wrap{
                padding:6px 8px 8px!important;
              }
              .title{
                margin:0 0 6px!important;
                font-size:16px!important;
                line-height:1.15!important;
              }
              .filters{
                margin-bottom:6px!important;
                padding:6px 8px!important;
                gap:5px 8px!important;
              }
              .summary{
                margin:0 0 5px!important;
                line-height:1.1!important;
              }
              .tableWrap{
                min-height:80px;
              }
              .back{
                margin:6px auto 0!important;
                padding:8px 14px!important;
                min-height:36px;
                font-size:13px!important;
              }
            }
          `;
          clearInterval(timer);
        }
      }catch(e){}
      if(tries>=100)clearInterval(timer);
    },100);
  }

  window.open=function(){
    const args=Array.prototype.slice.call(arguments);
    const win=originalOpen.apply(window,args);
    const url=String(args[0]==null?'':args[0]);
    if(win && (!url || url==='about:blank'))installFit(win);
    return win;
  };

  window.WATER_VIEW_FOOTER_FIT_BUILD=BUILD;
})();
