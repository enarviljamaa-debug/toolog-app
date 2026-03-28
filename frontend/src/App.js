import { useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:5000";

function App() {
  const [token, setToken] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [object, setObject] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [logs, setLogs] = useState([]);

  // FILTERS
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterObject, setFilterObject] = useState("");
  const [filterDesc, setFilterDesc] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showObjectFilter, setShowObjectFilter] = useState(false);
  const [showDescFilter, setShowDescFilter] = useState(false);

  // SORT
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  // LOGIN
  const login = async () => {
    const res = await axios.post(`${API}/login`, { email, password });
    setToken(res.data.token);
    loadLogs(res.data.token);
  };

  // LOAD LOGS
  const loadLogs = async (tok = token) => {
    const res = await axios.get(`${API}/worklogs`, {
      headers: { Authorization: tok },
    });
    setLogs(res.data);
  };

  // SAVE LOG
  const saveLog = async () => {
    await axios.post(
      `${API}/worklog`,
      { object, description, start_time: startTime, end_time: endTime, date },
      { headers: { Authorization: token } }
    );
    loadLogs();
  };

  // DELETE
  const deleteLog = async (id) => {
    await axios.delete(`${API}/worklog/${id}`, {
      headers: { Authorization: token },
    });
    loadLogs();
  };

  // FILTER LOGIC (timezone safe)
  const filteredLogs = logs.filter((log) => {
    const logDate = new Date(log.date).toLocaleDateString("sv-SE");

    return (
      (!filterFrom || logDate >= filterFrom) &&
      (!filterTo || logDate <= filterTo) &&
      (!filterObject ||
        log.object.toLowerCase().includes(filterObject.toLowerCase())) &&
      (!filterDesc ||
        log.description.toLowerCase().includes(filterDesc.toLowerCase()))
    );
  });

  // SORT
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === "date") {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }

    if (sortField === "hours") {
      aVal = aVal || 0;
      bVal = bVal || 0;
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // TOTAL HOURS
  const totalHours = sortedLogs.reduce((sum, log) => {
    return sum + (log.hours || 0);
  }, 0);

  return (
    <div className="container">
      <h1>Töölogi</h1>

      {!token && (
        <div className="card">
          <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="Parool"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={login}>Login</button>
        </div>
      )}

      {token && (
        <>
          <div className="card">
            <h3>Lisa logi</h3>

            <input placeholder="Objekt" onChange={(e) => setObject(e.target.value)} />
            <input
              placeholder="Kirjeldus"
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input type="time" onChange={(e) => setStartTime(e.target.value)} />
            <input type="time" onChange={(e) => setEndTime(e.target.value)} />

            <button onClick={saveLog}>Salvesta</button>
          </div>

          <div className="card">
            <h3>Kokku: {totalHours.toFixed(1)} h</h3>

            <table style={{ width: "100%" }}>
              <thead>
  <tr>
    <th onClick={() => toggleSort("date")}>
      Kuupäev{" "}
      {sortField === "date" ? (sortDirection === "asc" ? "↑" : "↓") : ""}

      <button onClick={(e) => { e.stopPropagation(); setShowDateFilter(!showDateFilter); }}>
        🔍
      </button>

      {showDateFilter && (
        <>
          <br />
          <input type="date" onChange={(e) => setFilterFrom(e.target.value)} />
          <input type="date" onChange={(e) => setFilterTo(e.target.value)} />
        </>
      )}
    </th>

    <th onClick={() => toggleSort("object")}>
      Objekt

      <button onClick={(e) => { e.stopPropagation(); setShowObjectFilter(!showObjectFilter); }}>
        🔍
      </button>

      {showObjectFilter && (
        <>
          <br />
          <input onChange={(e) => setFilterObject(e.target.value)} />
        </>
      )}
    </th>

    <th onClick={() => toggleSort("description")}>
      Kirjeldus

      <button onClick={(e) => { e.stopPropagation(); setShowDescFilter(!showDescFilter); }}>
        🔍
      </button>

      {showDescFilter && (
        <>
          <br />
          <input onChange={(e) => setFilterDesc(e.target.value)} />
        </>
      )}
    </th>

    <th>Algus</th>
    <th>Lõpp</th>

    <th onClick={() => toggleSort("hours")}>
      Tunnid{" "}
      {sortField === "hours" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
    </th>

    <th></th>
  </tr>
</thead>

              <tbody>
                {sortedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      {new Date(log.date).toLocaleDateString("et-EE")}
                    </td>
                    <td>{log.object}</td>
                    <td>{log.description}</td>
                    <td>{log.start_time?.slice(0, 5)}</td>
                    <td>{log.end_time?.slice(0, 5)}</td>
                    <td>{log.hours ? log.hours.toFixed(1) + " h" : "—"}</td>
                    <td>
                      <button onClick={() => deleteLog(log.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default App;