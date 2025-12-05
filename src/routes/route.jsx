import React from "react";
import { Navigate } from "react-router-dom";
import { isTokenExpired,  unsetToken } from "../helpers/jwt-token-access/accessToken";

function Authmiddleware(props){
  if (isTokenExpired()) {
    unsetToken();
    return (
      <Navigate to={{ pathname: "/login", state: { from: props.location } }} />
    );
  }
  
  return (<React.Fragment>
    {props.children}
  </React.Fragment>);
};

export default Authmiddleware;
