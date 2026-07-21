import{G as n,c as e,o as t}from"./index-Cq-2AIDZ.js";

const r={
  width:"100%",
  height:"calc(100vh - 126px)",
  minHeight:"640px",
  overflow:"hidden",
  border:"1px solid #dee0e3",
  borderRadius:"8px",
  background:"#fff",
  boxShadow:"0 1px 2px rgba(31,35,41,.06)"
};
const i={
  width:"100%",
  height:"100%",
  display:"block",
  border:"0",
  background:"#fff"
};
const a=n({
  __name:"ClosedLoopDataView",
  setup(){
    return()=>(t(),e("div",{style:r},[
      e("iframe",{
        src:"/lexiang-dashboard/index.html",
        title:"闭环交易数据",
        loading:"eager",
        style:i
      })
    ]));
  }
});

export{a as default};
