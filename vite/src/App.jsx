import "./App.css";
import { CSVLink } from "react-csv";
import { main } from "../../script/test";

const ExportButton = () => {
  // Example data (replace this with your actual data)
  const xyzData = [
    [
      "Word",
      "Pinyin",
      "OtherPinyin",
      "Level",
      "First Translation",
      "Other Translations",
      "ParentWord",
      "ParentPinyin",
      "Zhuyin",
    ],
    [
      "男",
      "nán",
      "",
      2,
      "male",
      "Baron, lowest of five orders of nobility 五等爵位[wu3 deng3 jue2 wei4], CL:個|个[ge4]",
      "",
      "",
      "ㄋㄢˊ",
    ],
    [
      "女",
      "nǚ",
      "",
      2,
      "female",
      "woman, daughter, archaic variant of 汝[ru3]",
      "",
      "",
      "ㄋㄩˇ",
    ],
    ["孩", "hái", "", 2, "child", "", "孩", "hái", "ㄏㄞˊ　˙ㄗ"],
  ];

  // CSVLink data
  const csvData = [...xyzData];

  // console.log(main());
  return (
    <div>
      <CSVLink data={csvData} filename={"xyz_data.csv"}>
        <button>Export CSV</button>
      </CSVLink>
    </div>
  );
};

function App() {
  return (
    <>
      <div>Hello</div>
      <ExportButton />
    </>
  );
}

export default App;
