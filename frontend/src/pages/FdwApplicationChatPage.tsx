import { Navigate, useSearchParams } from "react-router-dom";

/** Old chat-page links now return applicants to the full application form. */
const FdwApplicationChatPage = () => {
  const [searchParams] = useSearchParams();
  const formParams = new URLSearchParams(searchParams);
  formParams.delete("mode");
  const suffix = formParams.toString();
  return <Navigate to={`/apply-as-maid${suffix ? `?${suffix}` : ""}`} replace />;
};

export default FdwApplicationChatPage;
