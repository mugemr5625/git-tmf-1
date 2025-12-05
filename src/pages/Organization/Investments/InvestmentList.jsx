import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Button, notification, Grid, List, Avatar, Dropdown, Menu, Modal, 
  Badge, Divider, Skeleton, FloatButton, Select, Radio, DatePicker 
} from "antd";
import { DELETE, GET } from "helpers/api_helper";
import { INVESTMENT } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import { EllipsisOutlined, SearchOutlined, ReloadOutlined, PlusOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import lineIcon from "../../../assets/images/location.png";
import investmentIcon from "../../../assets/icons/industrial-area.png";
import dayjs from 'dayjs';
import "./InvestmentList.css";

import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import InvestmentCollapseContent from "components/Common/InvestmentCollapseContent";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Option } = Select;

const InvestmentList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [originalData, setOriginalData] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [expandedInvestments, setExpandedInvestments] = useState({});
  const [expandedLines, setExpandedLines] = useState({});
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [selectedBranchFromStorage, setSelectedBranchFromStorage] = useState(null);
  const [investmentsPagination, setInvestmentsPagination] = useState({});
  const [firstLoad, setFirstLoad] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [selectedLines, setSelectedLines] = useState([]);
  const [dateFilterType, setDateFilterType] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [searchCriteria, setSearchCriteria] = useState(null);
  const [dateError, setDateError] = useState("");
  
  const INVESTMENTS_PAGE_SIZE = 10;
  const today = dayjs().format('YYYY-MM-DD');
  const ALL_LINES_VALUE = "__ALL_LINES__";

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    const storedBranchName = localStorage.getItem("selected_branch_name");
    const accessToken = localStorage.getItem("access_token");

    setSelectedBranchFromStorage(storedBranchName);

    if (storedBranchName && accessToken) {
      getInvestmentList();
    } else {
      setTimeout(() => {
        const retryToken = localStorage.getItem("access_token");
        if (storedBranchName && retryToken) {
          getInvestmentList();
        }
      }, 300);
    }
  }, []);

  useEffect(() => {
    if (firstLoad && !loading && originalData.length > 0) {
      setSearchModalVisible(true);
      setFirstLoad(false);
    }
  }, [firstLoad, loading, originalData]);

  const groupInvestmentsByLine = (data) => {
    const grouped = {};
    data.forEach((investment) => {
      const lineName = investment.line_name || "Uncategorized";
      if (!grouped[lineName]) {
        grouped[lineName] = [];
      }
      grouped[lineName].push(investment);
    });
    return grouped;
  };

  const getUniqueLines = () => {
    const lines = [...new Set(originalData.map(inv => inv.line_name || "Uncategorized"))];
    return lines.sort();
  };

  const handleLineSelection = (values) => {
    if (values.includes(ALL_LINES_VALUE)) {
      setSelectedLines([ALL_LINES_VALUE]);
    } else {
      setSelectedLines(values);
    }
  };

  // Validate date inputs
  const validateDateRange = (fromDate, toDate) => {
    if (!fromDate || !toDate) {
      setDateError("Please select both from and to dates");
      return false;
    }

    const from = dayjs(fromDate);
    const to = dayjs(toDate);
    const todayDate = dayjs(today);

    if (from.isAfter(to)) {
      setDateError("From date cannot be greater than to date");
      return false;
    }

    if (to.isAfter(todayDate)) {
      setDateError("To date cannot be greater than today");
      return false;
    }

    setDateError("");
    return true;
  };

  const handleDateChange = (field, value) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);

    if (newDateRange.from && newDateRange.to) {
      validateDateRange(newDateRange.from, newDateRange.to);
    } else {
      setDateError("");
    }
  };

  const handleReset = () => {
    setInvestments([]);
    setGroupedData({});
    setInvestmentsPagination({});
    
    setShowReset(false);
    setSearchText("");
    setSelectedLines([]);
    setDateFilterType("all");
    setDateRange({ from: "", to: "" });
    setDateError("");
    setSearchCriteria(null);
    setHasSearched(false);
    
    notification.success({
      message: "Data Reset",
      description: "Please perform a new search to view investments.",
    });
    
    setTimeout(() => {
      setSearchModalVisible(true);
    }, 300);
  };

  const getInvestmentList = async () => {
    try {
      setLoading(true);
      const response = await GET(INVESTMENT);
      if (response?.status === 200) {
        const storedBranchName = localStorage.getItem("selected_branch_name");
        
        let filteredData = response.data;
        if (storedBranchName) {
          filteredData = response.data.filter(
            (item) => item.branch_name === storedBranchName
          );
        }
        
        setOriginalData(filteredData);
      } else {
        setOriginalData([]);
      }
    } catch (error) {
      setOriginalData([]);
      notification.error({
        message: "Error",
        description: "Failed to load investments",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeLinePagination = (lineName, totalInvestments) => {
    setInvestmentsPagination(prev => ({
      ...prev,
      [lineName]: {
        displayed: Math.min(INVESTMENTS_PAGE_SIZE, totalInvestments),
        total: totalInvestments
      }
    }));
  };

  const loadMoreInvestments = (lineName) => {
    setInvestmentsPagination(prev => {
      const current = prev[lineName] || { displayed: 0, total: 0 };
      return {
        ...prev,
        [lineName]: {
          ...current,
          displayed: Math.min(current.displayed + INVESTMENTS_PAGE_SIZE, current.total)
        }
      };
    });
  };

  const handleDelete = async (record) => {
    try {
      const response = await DELETE(`${INVESTMENT}${record.id}/`);
      if (response?.status === 204 || response?.status === 200) {
        const updatedData = investments.filter((item) => item.id !== record.id);
        const updatedOriginalData = originalData.filter((item) => item.id !== record.id);
        
        setInvestments(updatedData);
        setOriginalData(updatedOriginalData);
        setGroupedData(groupInvestmentsByLine(updatedData));
        
        notification.success({
          message: `${record.investment_title.toUpperCase()} Investment Deleted!`,
          description: "The investment has been deleted successfully",
        });
      } else {
        notification.error({
          message: "Investment Delete",
          description: "The investment was not deleted",
        });
      }
    } catch (error) {
      notification.error({
        message: "Investment Deleted",
        description: "The investment was not deleted",
      });
    }
  };

  const toggleLineExpansion = (lineName) => {
    setExpandedLines((prev) => ({
      ...prev,
      [lineName]: !prev[lineName]
    }));
  };

  const handleInvestmentAction = (lineName, investmentId) => {
    const key = `${lineName}-${investmentId}`;
    setOpenSwipeId(null);
    setExpandedInvestments((prev) => {
      const newState = {
        [key]: !prev[key]
      };
      
      if (newState[key]) {
        setTimeout(() => {
          const element = document.getElementById(`investment-item-${investmentId}`);
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 100);
      }
      
      return newState;
    });
  };

  const handleSwipeStateChange = (investmentId, isOpen) => {
    if (isOpen) {
      setOpenSwipeId(investmentId);
    } else if (openSwipeId === investmentId) {
      setOpenSwipeId(null);
    }
  };

  const handleSearch = () => {
    const isAllLinesSelected = selectedLines.includes(ALL_LINES_VALUE) || selectedLines.length === 0;
    const hasLineCriteria = !isAllLinesSelected && selectedLines.length > 0;
    const hasDateCriteria = dateFilterType === "range" && dateRange.from && dateRange.to;
    const hasTextCriteria = searchText.trim() !== "";

    if (!hasLineCriteria && !hasDateCriteria && !hasTextCriteria && !isAllLinesSelected) {
      notification.warning({
        message: "Search Required",
        description: "Please select at least one search criteria (line, date range, or investment title).",
      });
      return;
    }

    if (dateFilterType === "range" && (dateRange.from || dateRange.to)) {
      if (!validateDateRange(dateRange.from, dateRange.to)) {
        notification.error({
          message: "Invalid Date Range",
          description: dateError,
        });
        return;
      }
    }

    let filtered = [...originalData];

    if (hasLineCriteria) {
      filtered = filtered.filter(item => 
        selectedLines.includes(item.line_name || "Uncategorized")
      );
    }

    if (dateFilterType === "range" && dateRange.from && dateRange.to) {
      const fromDate = dayjs(dateRange.from).startOf('day');
      const toDate = dayjs(dateRange.to).endOf('day');
      
      filtered = filtered.filter(item => {
        const investmentDate = dayjs(item.created_date || item.investment_date);
        
        return (investmentDate.isAfter(fromDate) || investmentDate.isSame(fromDate)) && 
               (investmentDate.isBefore(toDate) || investmentDate.isSame(toDate));
      });
    }

    if (searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      filtered = filtered.filter(item => {
        const investmentTitle = (item.investment_title || "").toLowerCase();
        return investmentTitle.includes(query);
      });
    }

    const criteria = {
      lines: isAllLinesSelected ? ["All Lines"] : (hasLineCriteria ? selectedLines : null),
      dateType: dateFilterType,
      fromDate: dateRange.from ? dayjs(dateRange.from).format('DD-MMM-YYYY') : null,
      toDate: dateRange.to ? dayjs(dateRange.to).format('DD-MMM-YYYY') : null,
      searchText: searchText.trim() || null
    };

    setSearchCriteria(criteria);
    setInvestments(filtered);
    const grouped = groupInvestmentsByLine(filtered);
    setGroupedData(grouped);
    
    Object.keys(grouped).forEach(lineName => {
      initializeLinePagination(lineName, grouped[lineName].length);
    });
    
    setSearchModalVisible(false);
    setShowReset(true);
    setHasSearched(true);

    if (filtered.length === 0) {
      notification.warning({
        message: "No Results",
        description: "No investments found matching your search criteria.",
      });
    } else {
      const expandedLinesObj = {};
      Object.keys(grouped).forEach(lineName => {
        expandedLinesObj[lineName] = true;
      });
      setExpandedLines(expandedLinesObj);
      
      notification.success({
        message: "Search Complete",
        description: `${filtered.length} result(s) found.`,
      });
    }
  };

  const getSearchCriteriaDisplay = () => {
    if (!searchCriteria) return null;

    const parts = [];
    
    if (searchCriteria.lines && searchCriteria.lines.length > 0) {
      parts.push(`Lines: ${searchCriteria.lines.join(", ")}`);
    }
    
    if (searchCriteria.dateType === "range" && searchCriteria.fromDate && searchCriteria.toDate) {
      parts.push(`Date: ${searchCriteria.fromDate} to ${searchCriteria.toDate}`);
    } else if (searchCriteria.dateType === "all") {
      parts.push("Date: All");
    }
    
    if (searchCriteria.searchText) {
      parts.push(`Pattern: "${searchCriteria.searchText}"`);
    }

    return parts.join(" | ");
  };

  const searchModal = (
    <Modal
      title={<div className="investment-list-modal-title">Search Investment</div>}
      open={searchModalVisible}
      onOk={handleSearch}
      onCancel={hasSearched ? () => setSearchModalVisible(false) : undefined}
      okText="Search"
      cancelText="Cancel"
      cancelButtonProps={{ style: hasSearched ? {} : { display: 'none' } }}
      width={600}
      closable={hasSearched}
      maskClosable={hasSearched}
    >
      <div className="investment-list-modal-content">
       
        <div>
          <p className="investment-list-modal-label">Select Lines:</p>
          <Select
            mode="multiple"
            value={selectedLines}
            onChange={handleLineSelection}
            style={{ width: "100%" }}
            placeholder="Select lines"
            allowClear
            maxTagCount="responsive"
          >
            <Option key={ALL_LINES_VALUE} value={ALL_LINES_VALUE}>
              All Lines
            </Option>
            {getUniqueLines().map(line => (
              <Option key={line} value={line}>{line}</Option>
            ))}
          </Select>
        </div>

        <div>
          <p className="investment-list-modal-label">Date Filter:</p>
          <Radio.Group 
            value={dateFilterType} 
            onChange={(e) => {
              setDateFilterType(e.target.value);
              if (e.target.value === "all") {
                setDateRange({ from: "", to: "" });
                setDateError("");
              }
            }}
            style={{ marginBottom: 12 }}
          >
            <Radio value="all">Show All</Radio>
            <Radio value="range">Date Range</Radio>
          </Radio.Group>

          {dateFilterType === "range" && (
            <div className="investment-list-date-filter-container">
              <p className="investment-list-date-filter-label">
                Select date range:
              </p>
              <div className="investment-list-date-range-container">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => handleDateChange("from", e.target.value)}
                  max={dateRange.to || today}
                  className="investment-list-date-input"
                />
                <span className="investment-list-date-separator">to</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => handleDateChange("to", e.target.value)}
                  min={dateRange.from || undefined}
                  max={today}
                  className="investment-list-date-input"
                />
              </div>
              {dateError && (
                <p style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "8px" }}>
                  {dateError}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="investment-list-modal-label">Investment Title:</p>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Enter investment title to search"
            className="investment-list-search-input"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>
      </div>
    </Modal>
  );

  const handleEditInvestment = (investment) => navigate(`/investment/edit/${investment.id}`);

  return (
    <div className="investment-list-page-content">
      <div className="investment-list-header">
        <h2 className="investment-list-title">Investment List</h2>

        <div className="investment-list-actions">
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSearchModalVisible(true)}
            type="default"
          >
            {!isMobile && "Search"}
          </Button>
          {showReset && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              title="Reset to Original"
            />
          )}
        </div>
      </div>
      {searchModal}

      {loading && <Loader />}

      {hasSearched && (
        <div
          id="scrollableDiv"
          className="investment-list-scrollable-div"
        >
          {showReset && searchCriteria && (
            <div className="investment-list-search-results">
              <div className="investment-list-search-results-content">
                <span className="investment-list-search-label">
                  Search Results:
                </span>
                <div className="investment-list-search-criteria">
                  {getSearchCriteriaDisplay()}
                </div>
              </div>
              <Badge 
                count={Object.values(groupedData).flat().length}
                className="investment-list-results-badge"
              />
            </div>
          )}

          {Object.keys(groupedData).map((lineName) => {
            const isLineExpanded = true;
            
            return (
              <div
                key={lineName}
                className="investment-list-line-group"
              >
                <div className="investment-list-line-header">
                  <div className="investment-list-line-title-container">
                    <Avatar src={lineIcon}>
                      {lineName?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <span className="investment-list-line-title">
                      {lineName}
                    </span>
                  </div>
                  <Badge
                    count={groupedData[lineName].length}
                    className={showReset ? "investment-list-badge-search" : "investment-list-badge"}
                  />
                </div>

                <div 
                  id={'scrollableDiv-' + lineName}
                  className="investment-list-container"
                >
                  <InfiniteScroll
                    dataLength={investmentsPagination[lineName]?.displayed || INVESTMENTS_PAGE_SIZE}
                    next={() => loadMoreInvestments(lineName)}
                    hasMore={
                      (investmentsPagination[lineName]?.displayed || 0) < 
                      (investmentsPagination[lineName]?.total || 0)
                    }
                    loader={
                      <div className="investment-list-skeleton">
                        <Skeleton avatar paragraph={{ rows: 1 }} active />
                      </div>
                    }
                    endMessage={
                      <Divider plain className="investment-list-divider">
                        <span className="investment-list-divider-star">★ </span>
                        <span className="investment-list-divider-text">
                          End of{" "}
                          <span className="investment-list-divider-line-name">
                            {lineName}
                          </span> line{" "}
                          <span className="investment-list-divider-star">★</span>
                        </span>
                      </Divider>
                    }
                    scrollableTarget={'scrollableDiv-' + lineName}
                  >
                    <List
                      dataSource={
                        groupedData[lineName].slice(
                          0, 
                          investmentsPagination[lineName]?.displayed || INVESTMENTS_PAGE_SIZE
                        )
                      }
                      className="investment-list"
                      renderItem={(investment) => {
                        const isExpanded = expandedInvestments[lineName + '-' + investment.id];

                        return (
                          <div
                            key={investment.id}
                            id={'investment-item-' + investment.id}
                            className="investment-list-item-wrapper"
                          >
                            {isMobile ? (
                              <SwipeablePanel
                                item={investment}
                                index={investment.id}
                                titleKey="investment_title"
                                name="investment"
                                avatarSrc={investmentIcon}
                                onSwipeRight={!isExpanded ? () => handleEditInvestment(investment) : undefined}
                                onSwipeLeft={!isExpanded ? () => handleDelete(investment) : undefined}
                                isExpanded={isExpanded}
                                onExpandToggle={() => handleInvestmentAction(lineName, investment.id)}
                                renderContent={() => (
                                  isExpanded ? (
                                    <InvestmentCollapseContent investment={investment} />
                                  ) : null
                                )}
                                isSwipeOpen={openSwipeId === investment.id}
                                onSwipeStateChange={(isOpen) => handleSwipeStateChange(investment.id, isOpen)}
                              />
                            ) : (
                              <>
                                <List.Item
                                  className={isExpanded ? "investment-list-item investment-list-item-expanded" : "investment-list-item"}
                                >
                                  <List.Item.Meta
                                    avatar={
                                      <div className="investment-list-avatar-container">
                                        <img
                                          src={investmentIcon}
                                          alt="investment-icon"
                                          className="investment-list-avatar-icon"
                                        />
                                      </div>
                                    }
                                    title={
                                      <div
                                        onClick={() => handleInvestmentAction(lineName, investment.id)}
                                        className="investment-list-item-title-container"
                                      >
                                        <span className="investment-list-item-title">
                                          {investment.investment_title}
                                        </span>
                                        <Dropdown
                                          overlay={
                                            <Menu>
                                              <Menu.Item 
                                                key="edit"
                                                onClick={(e) => {
                                                  e.domEvent.stopPropagation();
                                                  handleEditInvestment(investment);
                                                }}
                                              >
                                                Edit
                                              </Menu.Item>
                                              <Menu.Item 
                                                key="delete"
                                                danger 
                                                onClick={(e) => {
                                                  e.domEvent.stopPropagation();
                                                  handleDelete(investment);
                                                }}
                                              >
                                                Delete
                                              </Menu.Item>
                                            </Menu>
                                          }
                                          trigger={["click"]}
                                        >
                                          <EllipsisOutlined
                                            className="investment-list-ellipsis-icon"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </Dropdown>
                                      </div>
                                    }
                                  />
                                </List.Item>

                                {isExpanded && (
                                  <div className="investment-list-collapse-content">
                                    <InvestmentCollapseContent investment={investment} />
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

          {Object.keys(groupedData).length === 0 && !loading && (
            <div className="investment-list-no-data">
              <p>No investments found matching your search criteria</p>
            </div>
          )}
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="investment-list-no-search">
          <SearchOutlined className="investment-list-no-search-icon" />
          <p className="investment-list-no-search-title">No Search Performed</p>
          <p className="investment-list-no-search-text">Please use the Search button to filter and view investments.</p>
        </div>
      )}

      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        tooltip={<div>Add New Investment</div>}
        onClick={() => navigate("/investment/add")}
        className="investment-list-float-button"
      />
    </div>
  );
};

export default InvestmentList;