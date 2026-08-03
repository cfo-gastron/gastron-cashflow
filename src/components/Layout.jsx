export default function Layout({ children, content, sidebar, page, setPage }) {
  return (
    <>
      {sidebar && (
        <div className="sidebar">
          {sidebar}
        </div>
      )}
      <div className="main">
        <div className="main-hdr" style={{paddingLeft:16}}>
          <span className="page-title">
            {page==='monthly'?'Monthly Report':page==='budget'?'Budget':page==='recurring'?'Recurring':page==='categories'?'Kategori':''}
          </span>
        </div>
        <div style={{flex:1,overflow:'auto'}}>
          {content ?? children?.content ?? children}
        </div>
      </div>
    </>
  )
}