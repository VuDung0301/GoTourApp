import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import Layout from '../../components/layout/Layout';
import DataTable from '../../components/common/DataTable';
import { flightsAPI } from '../../services/api';
import { format } from 'date-fns';
import StatusBadge from '../../components/common/StatusBadge';

const FlightsListPage = () => {
  const [flights, setFlights] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    airline: '',
    departureCity: '',
    arrivalCity: '',
    status: ''
  });

  useEffect(() => {
    fetchFlights();
  }, [pagination.page, searchTerm, filters]);

  const fetchFlights = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        keyword: searchTerm,
        ...filters
      };
      
      // Lọc bỏ các params trống
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      
      const response = await flightsAPI.getAll(params);
      
      if (response.success) {
        setFlights(response.data.flights);
        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          pages: response.pagination.pages
        });
      }
    } catch (error) {
      console.error('Error fetching flights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chuyến bay này không?')) {
      try {
        const response = await flightsAPI.delete(id);
        if (response.success) {
          fetchFlights();
        } else {
          alert('Không thể xóa chuyến bay. Vui lòng thử lại sau.');
        }
      } catch (error) {
        console.error('Delete flight error:', error);
        alert('Có lỗi xảy ra. Vui lòng thử lại sau.');
      }
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'HH:mm dd/MM/yyyy');
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const columns = [
    {
      key: 'flightNumber',
      label: 'Số hiệu',
      sortable: true
    },
    {
      key: 'airline',
      label: 'Hãng bay',
      sortable: true
    },
    {
      key: 'route',
      label: 'Tuyến bay',
      render: (item) => `${item.departureCity} - ${item.arrivalCity}`
    },
    {
      key: 'departureTime',
      label: 'Khởi hành',
      render: (item) => formatDateTime(item.departureTime)
    },
    {
      key: 'arrivalTime',
      label: 'Đến',
      render: (item) => formatDateTime(item.arrivalTime)
    },
    {
      key: 'duration',
      label: 'Thời gian bay',
      render: (item) => formatDuration(item.duration)
    },
    {
      key: 'economy',
      label: 'Giá phổ thông',
      render: (item) => formatPrice(item.price?.economy)
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (item) => <StatusBadge status={item.status} type="flight" />
    },
    {
      key: 'active',
      label: 'Đang hoạt động',
      render: (item) => item.active ? 
        <span className="text-green-600"><FaCheck /></span> : 
        <span className="text-red-600"><FaTimes /></span>
    },
    {
      key: 'actions',
      label: 'Thao tác',
      type: 'actions',
      actions: [
        {
          icon: <FaEdit />,
          label: 'Chỉnh sửa',
          onClick: (item) => window.location.href = `/flights/edit/${item._id}`,
          className: 'text-blue-600 hover:text-blue-800'
        },
        {
          icon: <FaTrash />,
          label: 'Xóa',
          onClick: (item) => handleDelete(item._id),
          className: 'text-red-600 hover:text-red-800'
        }
      ]
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Quản lý chuyến bay</h1>
          <Link to="/flights/create" className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <FaPlus className="mr-2" />
            Thêm chuyến bay
          </Link>
        </div>
        
        {/* Bộ lọc */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Bộ lọc</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hãng bay</label>
              <input
                type="text"
                name="airline"
                value={filters.airline}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Nhập hãng bay"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Điểm đi</label>
              <input
                type="text"
                name="departureCity"
                value={filters.departureCity}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Nhập điểm đi"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Điểm đến</label>
              <input
                type="text"
                name="arrivalCity"
                value={filters.arrivalCity}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Nhập điểm đến"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Tất cả</option>
                <option value="Đúng giờ">Đúng giờ</option>
                <option value="Trễ">Trễ</option>
                <option value="Hủy">Hủy</option>
                <option value="Đã bay">Đã bay</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    airline: '',
                    departureCity: '',
                    arrivalCity: '',
                    status: ''
                  });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Đặt lại
              </button>
            </div>
          </div>
        </div>
        
        <DataTable
          columns={columns}
          data={flights}
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          onRefresh={fetchFlights}
        />
      </div>
    </Layout>
  );
};

export default FlightsListPage; 