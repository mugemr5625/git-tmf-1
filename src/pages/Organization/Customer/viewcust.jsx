import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  notification,
  Grid,
  List,
  Avatar,
  Dropdown,
  Menu,
  Modal,
  Badge,
  Divider,
  Skeleton,
  Select,
} from "antd";
import { GET, DELETE } from "helpers/api_helper";
import { AREA } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import {
  EllipsisOutlined,
  ReloadOutlined,
  PlusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { FloatButton } from "antd";
import InfiniteScroll from "react-infinite-scroll-component";
import customerIcon from "../../../assets/icons/user.png"; // You may need to update this path
import areaIcon from "../../../assets/icons/residential-area.png";
import "./ViewCustomer.css"; // Create this CSS file based on ViewArea.css

const ViewCustomer = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [originalCustomers, setOriginalCustomers] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [tableLoader, setTableLoader] = useState(false);
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState({});
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [customersPagination, setCustomersPagination] = useState({});

  // Area data mapping
  const [areaData, setAreaData] = useState([]);
  const [areaMap, setAreaMap] = useState({}); // Map area id to area details

  // Filter states
  const [branches, setBranches] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);

  // Modal states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempBranch, setTempBranch] = useState(null);
  const [tempLine, setTempLine] = useState(null);

  const CUSTOMERS_PAGE_SIZE = 10;

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    // Show filter modal on component mount
    setFilterModalVisible(true);
    fetchAreaData();
    fetchCustomerData();
  }, []);

  const fetchAreaData = async () => {
    try {
      const response = await GET(AREA);
      if (response?.status === 200) {
        setAreaData(response.data);

        // Create a map for quick area lookup by id
        const areaMapping = {};
        response.data.forEach((area) => {
          areaMapping[area.id] = {
            areaName: area.areaName,
            branch_id: area.branch_id,
            branch_name: area.branch_name,
            line_id: area.line_id,
            line_name: area.line_name,
          };
        });
        setAreaMap(areaMapping);

        // Extract unique branches and lines from area data
        const uniqueBranches = [...new Set(response.data.map((a) => a.branch_name))].filter(Boolean);
        const uniqueLines = [...new Set(response.data.map((a) => a.line_name))].filter(Boolean);

        setBranches(
          uniqueBranches.sort().map((name) => ({ label: name, value: name }))
        );
        setLines(
          uniqueLines.sort().map((name) => ({ label: name, value: name }))
        );
      }
    } catch (error) {
      notification.error({
        message: "Error",
        description: "Failed to fetch area data",
      });
    }
  };

  const fetchCustomerData = async () => {
    try {
      setTableLoader(true);
      const response = await GET("/api/customers/");
      if (response?.status === 200) {
        setOriginalCustomers(response.data);
      }
    } catch (error) {
      notification.error({
        message: "Error",
        description: "Failed to fetch customer data",
      });
    } finally {
      setTableLoader(false);
    }
  };

  const groupCustomersByArea = (data) => {
    const grouped = {};
    data.forEach((customer) => {
      // Get area name from area map using area id
      const areaInfo = areaMap[customer.area];
      const areaName = areaInfo?.areaName || "Uncategorized";
      
      if (!grouped[areaName]) {
        grouped[areaName] = [];
      }
      
      // Enrich customer data with area details
      grouped[areaName].push({
        ...customer,
        area_name: areaName,
        branch_name: areaInfo?.branch_name || "N/A",
        line_name: areaInfo?.line_name || "N/A",
      });
    });
    return grouped;
  };

  const initializeAreaPagination = (areaName, totalCustomers) => {
    setCustomersPagination((prev) => ({
      ...prev,
      [areaName]: {
        displayed: Math.min(CUSTOMERS_PAGE_SIZE, totalCustomers),
        total: totalCustomers,
      },
    }));
  };

  const loadMoreCustomers = (areaName) => {
    setCustomersPagination((prev) => {
      const current = prev[areaName] || { displayed: 0, total: 0 };
      return {
        ...prev,
        [areaName]: {
          ...current,
          displayed: Math.min(
            current.displayed + CUSTOMERS_PAGE_SIZE,
            current.total
          ),
        },
      };
    });
  };

  const handleApplyFilter = () => {
    if (!tempBranch || !tempLine) {
      notification.warning({
        message: "Incomplete Selection",
        description: "Please select both Branch and Line to proceed.",
      });
      return;
    }

    setSelectedBranch(tempBranch);
    setSelectedLine(tempLine);

    // First, find all area IDs that match the selected branch and line
    const matchingAreaIds = areaData
      .filter((area) => area.branch_name === tempBranch && area.line_name === tempLine)
      .map((area) => area.id);

    // Filter customers based on matching area IDs
    const filtered = originalCustomers.filter((customer) =>
      matchingAreaIds.includes(customer.area)
    );

    setCustomers(filtered);
    const grouped = groupCustomersByArea(filtered);
    setGroupedData(grouped);

    Object.keys(grouped).forEach((areaName) => {
      initializeAreaPagination(areaName, grouped[areaName].length);
    });

    setFilterModalVisible(false);

    if (filtered.length === 0) {
      notification.warning({
        message: "No Customers Found",
        description: `No customers found for the selected Branch and Line.`,
      });
    } else {
      notification.success({
        message: "Filter Applied",
        description: `${filtered.length} customer(s) found.`,
      });
    }
  };

  const handleReset = () => {
    setSelectedBranch(null);
    setSelectedLine(null);
    setTempBranch(null);
    setTempLine(null);
    setCustomers([]);
    setGroupedData({});
    setFilterModalVisible(true);

    notification.info({
      message: "Filters Reset",
      description: "Please select filters again.",
    });
  };

  const handleCustomerAction = (areaName, customerId) => {
    const key = `${areaName}-${customerId}`;
    setOpenSwipeId(null);
    setExpandedAreas((prev) => {
      const newState = {
        [key]: !prev[key],
      };

      if (newState[key]) {
        setTimeout(() => {
          const element = document.getElementById(`customer-item-${customerId}`);
          if (element) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
          }
        }, 100);
      }

      return newState;
    });
  };

  const handleSwipeStateChange = (customerId, isOpen) => {
    if (isOpen) {
      setOpenSwipeId(customerId);
    } else if (openSwipeId === customerId) {
      setOpenSwipeId(null);
    }
  };

  const handleEditCustomer = (customer) =>
    navigate(`/customer/edit/${customer.id}`);

  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`/api/customers/${record.id}/`);
      if (response?.status === 200) {
        const updatedData = customers.filter((item) => item.id !== record.id);
        setCustomers(updatedData);
        setGroupedData(groupCustomersByArea(updatedData));
        notification.success({
          message: `Customer ${record?.customer_id} Deleted!`,
          description: "The customer has been deleted successfully",
          duration: 3,
        });
      } else {
        notification.error({
          message: "Customer Delete",
          description: "The customer was not deleted",
          duration: 3,
        });
      }
      setDeleteLoader(false);
    } catch (error) {
      setDeleteLoader(false);
      notification.error({
        message: "Customer Delete",
        description: "The customer was not deleted",
        duration: 3,
      });
    }
  };

  const filterModal = (
    <Modal
      title={
        <div style={{ textAlign: "center" }}>Select Branch & Line</div>
      }
      open={filterModalVisible}
      onCancel={() => {
        if (selectedBranch && selectedLine) {
          setFilterModalVisible(false);
        } else {
          notification.warning({
            message: "Selection Required",
            description: "Please select both Branch and Line to view customers.",
          });
        }
      }}
      footer={[
        <Button
          key="reset"
          onClick={() => {
            setTempBranch(null);
            setTempLine(null);
          }}
        >
          Clear
        </Button>,
        <Button
          key="submit"
          type="primary"
          disabled={!tempBranch || !tempLine}
          onClick={handleApplyFilter}
        >
          Apply
        </Button>,
      ]}
      closable={selectedBranch && selectedLine}
    >
      <div style={{ marginBottom: "15px" }}>
        <label
          htmlFor="branch-select"
          style={{ fontWeight: "400", display: "block", marginBottom: "5px" }}
        >
          Select Branch Name
        </label>
        <Select
          id="branch-select"
          placeholder="Select a branch"
          style={{ width: "100%" }}
          onChange={setTempBranch}
          value={tempBranch}
          options={branches}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label
          htmlFor="line-select"
          style={{ fontWeight: "400", display: "block", marginBottom: "5px" }}
        >
          Select Line Name
        </label>
        <Select
          id="line-select"
          placeholder="Select a line"
          style={{ width: "100%" }}
          onChange={setTempLine}
          value={tempLine}
          options={lines}
        />
      </div>
    </Modal>
  );

  const CustomerCollapseContent = ({ customer }) => (
    <div style={{ padding: "10px 15px", fontSize: "14px", lineHeight: "1.8" }}>
      <div>
        <strong>Customer ID:</strong> {customer.customer_id}
      </div>
      <div>
        <strong>Name:</strong> {customer.customer_name}
      </div>
      <div>
        <strong>Mobile:</strong> {customer.mobile_number || "N/A"}
      </div>
      <div>
        <strong>Alternate Mobile:</strong> {customer.alternate_mobile_number || "N/A"}
      </div>
      <div>
        <strong>Email:</strong> {customer.email_id || "N/A"}
      </div>
      <div>
        <strong>Address:</strong> {customer.address || "N/A"}
      </div>
      <div>
        <strong>Aadhaar:</strong> {customer.aadhaar_id || "N/A"}
      </div>
      <div>
        <strong>PAN:</strong> {customer.pan_number || "N/A"}
      </div>
      <div>
        <strong>Profession:</strong> {customer.profession || "N/A"}
      </div>
      <div>
        <strong>Branch:</strong> {customer.branch_name}
      </div>
      <div>
        <strong>Line:</strong> {customer.line_name}
      </div>
      <div>
        <strong>Area:</strong> {customer.area_name}
      </div>
    </div>
  );

  return (
    <div className="view-customer-page-content">
      <div className="view-customer-header-container">
        <h2 className="view-customer-title">Customer List</h2>

        <div className="view-customer-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            title="Change Filters"
          >
            {!isMobile && "Change Filters"}
          </Button>
        </div>
      </div>

      {filterModal}

      {tableLoader && <Loader />}

      <div id="scrollableDiv" className="view-customer-scrollable-div">
        {selectedBranch && selectedLine && (
          <div className="view-customer-filter-info">
            <div>
              <strong>Branch:</strong> {selectedBranch}
            </div>
            <div>
              <strong>Line:</strong> {selectedLine}
            </div>
          </div>
        )}

        {Object.keys(groupedData).map((areaName) => {
          return (
            <div key={areaName} className="view-customer-area-group">
              <div className="view-customer-area-header">
                <div className="view-customer-area-title-container">
                  <Avatar src={areaIcon}>
                    {areaName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <span className="view-customer-area-title">{areaName}</span>
                </div>
                <Badge
                  count={groupedData[areaName].length}
                  className="view-customer-badge"
                />
              </div>

              <div
                id={"scrollableDiv-" + areaName}
                className="view-customer-list-container"
              >
                <InfiniteScroll
                  dataLength={
                    customersPagination[areaName]?.displayed ||
                    CUSTOMERS_PAGE_SIZE
                  }
                  next={() => loadMoreCustomers(areaName)}
                  hasMore={
                    (customersPagination[areaName]?.displayed || 0) <
                    (customersPagination[areaName]?.total || 0)
                  }
                  loader={
                    <div className="view-customer-skeleton-container">
                      <Skeleton avatar paragraph={{ rows: 1 }} active />
                    </div>
                  }
                  endMessage={
                    <Divider plain className="view-customer-divider-container">
                      <span className="view-customer-divider-star">★ </span>
                      <span className="view-customer-divider-text">
                        End of{" "}
                        <span className="view-customer-divider-area-name">
                          {areaName}
                        </span>{" "}
                        customers{" "}
                        <span className="view-customer-divider-star">★</span>
                      </span>
                    </Divider>
                  }
                  scrollableTarget={"scrollableDiv-" + areaName}
                >
                  <List
                    dataSource={groupedData[areaName].slice(
                      0,
                      customersPagination[areaName]?.displayed ||
                        CUSTOMERS_PAGE_SIZE
                    )}
                    className="view-customer-list"
                    renderItem={(customer, index) => {
                      const isExpanded =
                        expandedAreas[areaName + "-" + customer.id];
                      const displayIndex = index + 1;

                      return (
                        <div
                          key={customer.id}
                          id={"customer-item-" + customer.id}
                          className="view-customer-list-item-wrapper"
                        >
                          {isMobile ? (
                            <SwipeablePanel
                              item={customer}
                              index={customer.id}
                              titleKey="customer_name"
                              subtitleKey="customer_id"
                              name="customer"
                              avatarSrc={customerIcon}
                              onSwipeRight={
                                !isExpanded
                                  ? () => handleEditCustomer(customer)
                                  : undefined
                              }
                              onSwipeLeft={
                                !isExpanded
                                  ? () => onDelete(customer)
                                  : undefined
                              }
                              isExpanded={isExpanded}
                              onExpandToggle={() =>
                                handleCustomerAction(areaName, customer.id)
                              }
                              renderContent={() =>
                                isExpanded ? (
                                  <CustomerCollapseContent
                                    customer={customer}
                                  />
                                ) : null
                              }
                              isSwipeOpen={openSwipeId === customer.id}
                              onSwipeStateChange={(isOpen) =>
                                handleSwipeStateChange(customer.id, isOpen)
                              }
                            />
                          ) : (
                            <>
                              <List.Item
                                className={
                                  isExpanded
                                    ? "view-customer-list-item view-customer-list-item-expanded"
                                    : "view-customer-list-item"
                                }
                              >
                                <List.Item.Meta
                                  avatar={
                                    <div className="view-customer-avatar-container">
                                      <img
                                        src={customerIcon}
                                        alt="customer-icon"
                                        className="view-customer-avatar-icon"
                                      />
                                    </div>
                                  }
                                  title={
                                    <div
                                      onClick={() =>
                                        handleCustomerAction(
                                          areaName,
                                          customer.id
                                        )
                                      }
                                      className="view-customer-item-title-container"
                                    >
                                      <div>
                                        <div className="view-customer-item-title">
                                          {displayIndex}. {customer.customer_name}
                                        </div>
                                        <div className="view-customer-item-subtitle">
                                          ID: {customer.customer_id}
                                        </div>
                                      </div>
                                      <Dropdown
                                        overlay={
                                          <Menu>
                                            <Menu.Item
                                              key="edit"
                                              onClick={(e) => {
                                                e.domEvent.stopPropagation();
                                                handleEditCustomer(customer);
                                              }}
                                            >
                                              Edit
                                            </Menu.Item>
                                            <Menu.Item
                                              key="delete"
                                              danger
                                              onClick={(e) => {
                                                e.domEvent.stopPropagation();
                                                onDelete(customer);
                                              }}
                                            >
                                              Delete
                                            </Menu.Item>
                                          </Menu>
                                        }
                                        trigger={["click"]}
                                      >
                                        <EllipsisOutlined
                                          className="view-customer-ellipsis-icon"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </Dropdown>
                                    </div>
                                  }
                                />
                              </List.Item>

                              {isExpanded && (
                                <div className="view-customer-collapse-content">
                                  <CustomerCollapseContent
                                    customer={customer}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    }}
                  />
                </InfiniteScroll>
              </div>
            </div>
          );
        })}

        {Object.keys(groupedData).length === 0 &&
          !tableLoader &&
          selectedBranch &&
          selectedLine && (
            <div className="view-customer-no-data">
              <p>No customers found for the selected filters</p>
            </div>
          )}
      </div>

      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        tooltip={<div>Add New Customer</div>}
        onClick={() => navigate("/customer/add")}
        className="view-customer-float-button"
      />
    </div>
  );
};

export default ViewCustomer;