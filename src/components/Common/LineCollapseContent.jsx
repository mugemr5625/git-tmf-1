import React from "react";
import { Descriptions } from "antd";

const LineCollapseContent = ({ line }) => {
  if (!line) return null;

  return (
    <div style={{ background: "#fff", padding: "0px 0px" }}>
      <Descriptions
        bordered
        size="small"
        column={{ xs: 1, sm: 2, md: 3 }}
        labelStyle={{
          fontWeight: 700,
          background: "#e5e4e4ff",
          width: "140px",
        }}
      >
        <Descriptions.Item label="Line Name:">
          {line.lineName || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Branch Name:">
          {line.branch_name || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Line Type:">
          {line.lineType || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Installments:">
          {line.installment ?? "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Bad Installments:">
          {line.badinstallment ?? "N/A"}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
};

export default LineCollapseContent;
