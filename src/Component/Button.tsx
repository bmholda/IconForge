export function Button(props: React.ComponentPropsWithoutRef<"button">){
    return (
    <button 
      {...props} 
      className="bg-blue-400 px-4 py-2 rounded hover:bg-blue-500">
      {props.children}
    </button>
  );
}